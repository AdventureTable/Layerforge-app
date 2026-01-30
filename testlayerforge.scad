/*
  LayerForge™ Filament Td Test Card
  - Wider bands for clearer numeric labels
*/

$fn = 64;

// ---------- User-tunable parameters ----------
project_name = "LayerForge™";

// Card size (WIDER)
card_w = 170;
card_h = 70;
corner_r = 8;

// Thickness
base_t = 0.30;

// Step thicknesses in mm
steps = [0.30,0.40,0.50,0.60,0.70,0.80,0.90,1.00,1.20,1.40,1.60,1.80,2.00,2.40];

// Inner bands area margins
m_left   = 12;
m_right  = 12;
m_top    = 12;
m_bottom = 18;

bands_h = card_h - m_top - m_bottom;
bands_w = card_w - m_left - m_right;

// MORE separation between bands
band_gap = 1.20;

// Text styling
num_text_size = 4.6;
num_text_depth = 0.60;
num_y_offset = 6.5;

logo_text_size = 7.0;
logo_text_depth = 0.80;
logo_margin_x = 6;
logo_margin_y = 5;

// Optional frame
frame_on = true;
frame_th = 0.60;
frame_raise = 0.35;

// ---------- Helpers ----------
module rounded_rect_2d(w, h, r) {
  offset(r = r)
    square([w - 2*r, h - 2*r], center = true);
}

module card_base() {
  linear_extrude(height = base_t)
    rounded_rect_2d(card_w, card_h, corner_r);
}

module bands_area_frame() {
  if (frame_on) {
    x0 = -card_w/2 + m_left;
    y0 = -card_h/2 + m_bottom;
    translate([x0, y0, base_t])
      linear_extrude(height = frame_raise)
        difference() {
          square([bands_w, bands_h], center = false);
          translate([frame_th, frame_th, 0])
            square([bands_w - 2*frame_th, bands_h - 2*frame_th], center = false);
        }
  }
}

module step_bands() {
  n = len(steps);
  band_w = (bands_w - (n - 1)*band_gap) / n;

  x0 = -card_w/2 + m_left;
  y0 = -card_h/2 + m_bottom;

  for (i = [0 : n-1]) {
    t_total = steps[i];
    extra = max(0, t_total - base_t);
    if (extra > 0) {
      xi = x0 + i*(band_w + band_gap);
      translate([xi, y0, base_t])
        cube([band_w, bands_h, extra], center = false);
    }
  }
}

module numbers() {
  step_labels = ["0.3","0.4","0.5","0.6","0.7","0.8","0.9",
                 "1.0","1.2","1.4","1.6","1.8","2.0","2.4"];

  n = len(step_labels);
  band_w = (bands_w - (n - 1)*band_gap) / n;

  x0 = -card_w/2 + m_left;
  y_num = -card_h/2 + num_y_offset;

  for (i = [0 : n-1]) {
    x_center = x0 + i*(band_w + band_gap) + band_w/2;
    translate([x_center, y_num, base_t])
      linear_extrude(height = num_text_depth)
        text(step_labels[i],
             size = num_text_size,
             halign = "center",
             valign = "center",
             font = "Liberation Sans:style=Bold");
  }
}
module band_separators() {
  n = len(steps);
  band_w = (bands_w - (n - 1)*band_gap) / n;

  x0 = -card_w/2 + m_left;
  y0 = -card_h/2 + m_bottom;

  sep_w = 0.35; // thickness of separator line in mm
  sep_h = bands_h;

  for (i = [1 : n-1]) {
    xi = x0 + i*(band_w + band_gap) - band_gap/2 - sep_w/2;
    translate([xi, y0, base_t])
      cube([sep_w, sep_h, 0.25], center = false);
  }
}

module logo() {
  x_logo =  card_w/2 - logo_margin_x;
  y_logo =  card_h/2 - logo_margin_y;

  translate([x_logo, y_logo, base_t])
    linear_extrude(height = logo_text_depth)
      text(project_name,
           size = logo_text_size,
           halign = "right",
           valign = "top",
           font = "Liberation Sans:style=Bold");
}

// ---------- Main ----------
union() {
  card_base();
  step_bands();
  band_separators();
  bands_area_frame();
  numbers();
  logo();
}
