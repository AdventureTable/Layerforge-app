use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelGeometrySettings {
    pub min_depth_mm: f64,
    pub max_depth_mm: f64,
    pub gamma: f64,
    pub contrast: f64,
    pub offset: f64,
    pub smoothing: f64,
    pub spike_removal: String,
    pub invert: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrintSettings {
    pub layer_height_mm: f64,
    pub base_layer_mm: f64,
    pub width_mm: f64,
    pub height_mm: f64,
    pub border_width_mm: f64,
    pub border_depth_mm: f64,
    pub has_border: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Filament {
    pub id: String,
    pub name: String,
    pub hex_color: String,
    pub td: f64,
    pub enabled: bool,
    pub order_index: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColorStop {
    pub filament_id: String,
    pub threshold_z_mm: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SwapEntry {
    pub layer: i32,
    pub z_mm: f64,
    pub filament_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessImageRequest {
    pub image_path: String,
    pub geometry: ModelGeometrySettings,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessImageResponse {
    pub heightmap_base64: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateMeshRequest {
    pub heightmap_base64: String,
    pub width: u32,
    pub height: u32,
    pub geometry: ModelGeometrySettings,
    pub print_settings: PrintSettings,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComputePreviewRequest {
    pub heightmap_base64: String,
    pub width: u32,
    pub height: u32,
    pub filaments: Vec<Filament>,
    pub stops: Vec<ColorStop>,
    pub geometry: ModelGeometrySettings,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComputeSwapsRequest {
    pub stops: Vec<ColorStop>,
    pub layer_height_mm: f64,
    pub min_depth_mm: f64,
    pub max_depth_mm: f64,
}

async fn call_python_sidecar(
    app: tauri::AppHandle,
    method: &str,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    use tauri_plugin_shell::process::CommandEvent;
    use std::sync::Arc;
    use tokio::sync::Mutex;
    
    let request = serde_json::json!({
        "method": method,
        "params": params
    });
    let request_str = request.to_string();

    let shell = app.shell();
    let sidecar = shell
        .sidecar("cheapforge-core")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    let (mut rx, mut child) = sidecar
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Write request to stdin
    child
        .write((request_str + "\n").as_bytes())
        .map_err(|e| format!("Failed to write to stdin: {}", e))?;

    // Collect stdout
    let stdout_data = Arc::new(Mutex::new(Vec::new()));
    let stderr_data = Arc::new(Mutex::new(Vec::new()));
    
    let stdout_clone = stdout_data.clone();
    let stderr_clone = stderr_data.clone();
    
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                stdout_clone.lock().await.extend_from_slice(&line);
            }
            CommandEvent::Stderr(line) => {
                stderr_clone.lock().await.extend_from_slice(&line);
            }
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }

    let stdout = String::from_utf8_lossy(&stdout_data.lock().await).to_string();
    let stderr = String::from_utf8_lossy(&stderr_data.lock().await).to_string();

    if !stderr.is_empty() && stdout.is_empty() {
        return Err(format!("Sidecar error: {}", stderr));
    }

    let response: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse response: {} - stdout: {}", e, stdout))?;
    
    // Check if Python returned an error
    if let Some(error) = response.get("error") {
        let traceback = response.get("traceback")
            .and_then(|t| t.as_str())
            .unwrap_or("");
        return Err(format!("Python error: {} \n{}", error, traceback));
    }
    
    Ok(response)
}

#[tauri::command]
pub async fn process_image(
    app: tauri::AppHandle,
    request: ProcessImageRequest,
) -> Result<ProcessImageResponse, String> {
    let params = serde_json::to_value(&request).map_err(|e| e.to_string())?;
    let response = call_python_sidecar(app, "process_image", params).await?;
    serde_json::from_value(response).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_mesh(
    app: tauri::AppHandle,
    request: GenerateMeshRequest,
    output_path: String,
) -> Result<String, String> {
    let params = serde_json::json!({
        "request": request,
        "output_path": output_path
    });
    let response = call_python_sidecar(app, "generate_mesh", params).await?;
    response["path"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No path in response".to_string())
}

#[tauri::command]
pub async fn compute_preview(
    app: tauri::AppHandle,
    request: ComputePreviewRequest,
) -> Result<String, String> {
    let params = serde_json::to_value(&request).map_err(|e| e.to_string())?;
    let response = call_python_sidecar(app, "compute_preview", params).await?;
    response["preview_base64"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No preview in response".to_string())
}

#[tauri::command]
pub async fn compute_swaps(
    app: tauri::AppHandle,
    request: ComputeSwapsRequest,
) -> Result<Vec<SwapEntry>, String> {
    let params = serde_json::to_value(&request).map_err(|e| e.to_string())?;
    let response = call_python_sidecar(app, "compute_swaps", params).await?;
    serde_json::from_value(response["swaps"].clone()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_stl(
    app: tauri::AppHandle,
    request: GenerateMeshRequest,
    output_path: String,
) -> Result<String, String> {
    generate_mesh(app, request, output_path).await
}

#[tauri::command]
pub async fn export_plan(
    app: tauri::AppHandle,
    swaps: Vec<SwapEntry>,
    filaments: Vec<Filament>,
    print_settings: PrintSettings,
    geometry: ModelGeometrySettings,
    output_path: String,
    format: String,
) -> Result<String, String> {
    let params = serde_json::json!({
        "swaps": swaps,
        "filaments": filaments,
        "print_settings": print_settings,
        "geometry": geometry,
        "output_path": output_path,
        "format": format
    });
    let response = call_python_sidecar(app, "export_plan", params).await?;
    response["path"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No path in response".to_string())
}

#[tauri::command]
pub async fn save_project(project_json: String, output_path: String) -> Result<String, String> {
    std::fs::write(&output_path, &project_json).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub async fn load_project(input_path: String) -> Result<String, String> {
    std::fs::read_to_string(&input_path).map_err(|e| e.to_string())
}
