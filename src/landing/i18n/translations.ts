export type Language = 'en' | 'es';

interface FeatureItem {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export interface TranslationKeys {
  hero: {
    title: string;
    titleHighlight: string;
    titleEnd: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    cta: string;
    ctaSecondary: string;
    ctaManifesto: string;
    subtitle: string;
    signature: string;
  };
  terminal: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    line7: string;
    title: string;
  };
  interface: {
    label: string;
    title: string;
    subtitleMobile: string;
    subtitleDesktop: string;
    mobileTitle: string;
    mobileDesc: string;
    mobileNote: string;
    mobileBtn: string;
  };
  features: {
    label: string;
    title: string;
    items: FeatureItem[];
  };
  philosophy: {
    title1: string;
    titleHighlight: string;
    title2: string;
    subtitle: string;
    quote: string;
  };
  manifesto: {
    label: string;
    title: string;
    line1: string;
    line2: string;
    line3: string;
    quote: string;
  };
  download: {
    label: string;
    title: string;
    subtitle: string;
    badge: string;
    windows: string;
    mac: string;
    linux: string;
    supportTitle: string;
    supportDesc: string;
    instagram: string;
    etsy: string;
    coffee: string;
    note: string;
    installTitle: string;
    windowsNote: string;
    macNote: string;
  };
  faq: {
    label: string;
    title: string;
    items: FaqItem[];
  };
  footer: {
    tagline: string;
    motto: string;
    manifesto: string;
    support: string;
    contact: string;
    copyright: string;
    poweredBy: string;
    adventureTable: string;
  };
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    hero: {
      title: 'Transform an image into a',
      titleHighlight: 'multicolor relief',
      titleEnd: 'from another dimension.',
      bullet1: 'Export STL + Color change plan',
      bullet2: 'Plan changes by Z height',
      bullet3: 'Unlimited colors',
      cta: 'Download Free',
      ctaSecondary: 'See what it does',
      ctaManifesto: 'Read the manifesto',
      subtitle: 'Free forever · Commercial use allowed',
      signature: 'Nah. I\'ll win.',
    },
    terminal: {
      line1: '> Input: image.png',
      line2: '  → height map generated',
      line3: '> Layers: planning color changes...',
      line4: '> Export: generating STL',
      line5: '                              → done.',
      line7: 'ok: color plan exported',
      title: 'It\'s done, isn\'t it?',
    },
    interface: {
      label: 'THE INTERFACE',
      title: 'Simple. Direct. No fluff.',
      subtitleMobile: 'Better experience on desktop',
      subtitleDesktop: 'Try the controls - it\'s the real app',
      mobileTitle: 'Interactive interface',
      mobileDesc: 'The full demo is designed for larger screens. Try it on desktop for the complete experience.',
      mobileNote: 'Or better yet, download it and use it wherever you want.',
      mobileBtn: 'Download',
    },
    features: {
      label: 'FEATURES',
      title: 'What you need. Nothing more.',
      items: [
        {
          title: 'Real relief, not texture',
          description: 'Generates physical volume. Color makes sense because there\'s height. No visual tricks.',
        },
        {
          title: 'Unlimited colors',
          description: 'No artificial limits. Layers are layers.',
        },
        {
          title: 'Color change plan by height (Z)',
          description: 'Export a clear list of color changes for your slicer. Repeatable. Predictable.',
        },
        {
          title: 'Layer preview',
          description: 'See how layers read before printing. Adjust and done.',
        },
        {
          title: 'Export STL + Change plan',
          description: 'Your file. Your slicer. Your printer.',
        },
        {
          title: 'Human license',
          description: 'Free forever. Personal and commercial use allowed. No punishment for creating.',
        },
      ],
    },
    philosophy: {
      title1: 'A simple tool',
      titleHighlight: 'shouldn\'t cost',
      title2: 'as much as a printer.',
      subtitle: 'Nor should it get weird when you want to sell what you make.',
      quote: 'LayerForge exists because sometimes it\'s more fun to build a tool than to argue about it.',
    },
    manifesto: {
      label: 'MANIFESTO',
      title: 'LayerForge wasn\'t born from rage. It was born from curiosity.',
      line1: 'From asking: "Why is this like this?"',
      line2: 'And a simple answer: "Nah. I\'ll do it myself."',
      line3: 'It\'s not an attack. It\'s not a crusade. It\'s a quiet smile while the code compiles.',
      quote: '"Nah. I\'ll win."',
    },
    download: {
      label: 'DOWNLOAD',
      title: 'Free Forever',
      subtitle: 'If you like it, support us',
      badge: 'Free',
      windows: 'Windows',
      mac: 'macOS',
      linux: 'Linux',
      supportTitle: 'Support the project',
      supportDesc: 'LayerForge is free, but you can help us keep creating:',
      instagram: 'Follow on Instagram',
      etsy: 'Visit our Etsy shop',
      coffee: 'Buy me a coffee',
      note: 'Works offline. No registration required.',
      installTitle: 'Installation notes',
      windowsNote: 'Windows may show a "Windows protected your PC" warning. This is normal for indie software. Click "More info" then "Run anyway".',
      macNote: 'macOS may block the app. Right-click the app, select "Open", then click "Open" in the dialog. You only need to do this once.',
    },
    faq: {
      label: 'FAQ',
      title: 'Frequently Asked Questions',
      items: [
        {
          question: 'Is it a slicer?',
          answer: 'No. LayerForge generates the model and the color change plan by height. Then you use your usual slicer.',
        },
        {
          question: 'How do I make the color changes?',
          answer: 'By layer (pauses / color change) or with AMS/MMU/CFS. LayerForge gives you the heights.',
        },
        {
          question: 'Can I sell my prints?',
          answer: 'Yes. That\'s literally the point.',
        },
        {
          question: 'Will it have a subscription?',
          answer: 'No. If it ever did, it wouldn\'t be LayerForge anymore.',
        },
        {
          question: 'Why is it free?',
          answer: 'Because we believe in building community. If you like it, support us on Instagram or our Etsy shop.',
        },
      ],
    },
    footer: {
      tagline: 'Built out of curiosity.',
      motto: 'Nah. I\'ll win.',
      manifesto: 'Manifesto',
      support: 'Support',
      contact: 'Contact',
      copyright: '© {year} LayerForge. Made with curiosity.',
      poweredBy: 'Powered by',
      adventureTable: 'Adventure Table',
    },
  },
  es: {
    hero: {
      title: 'Convierte una imagen en un',
      titleHighlight: 'relieve multicolor',
      titleEnd: 'de otra dimensión.',
      bullet1: 'Exporta STL + Plan de cambios',
      bullet2: 'Planifica cambios por Z',
      bullet3: 'Colores ilimitados',
      cta: 'Descargar Gratis',
      ctaSecondary: 'Ver qué hace',
      ctaManifesto: 'Leer el manifiesto',
      subtitle: 'Gratis para siempre · Uso comercial permitido',
      signature: 'Nah. I\'ll win.',
    },
    terminal: {
      line1: '> Input: imagen.png',
      line2: '  → height map generado',
      line3: '> Layers: planificando cambios de color...',
      line4: '> Export: generando STL',
      line5: '                              → hecho.',
      line7: 'ok: color plan exported',
      title: 'It\'s done, isn\'t it?',
    },
    interface: {
      label: 'LA INTERFAZ',
      title: 'Simple. Directa. Sin rodeos.',
      subtitleMobile: 'Mejor experiencia en desktop',
      subtitleDesktop: 'Prueba los controles - es la aplicación real',
      mobileTitle: 'Interfaz interactiva',
      mobileDesc: 'La demo completa está diseñada para pantallas más grandes. Pruébala en desktop para la experiencia completa.',
      mobileNote: 'O mejor aún, descárgala y úsala donde quieras.',
      mobileBtn: 'Descargar',
    },
    features: {
      label: 'CARACTERÍSTICAS',
      title: 'Lo que necesitas. Nada más.',
      items: [
        {
          title: 'Relieve real, no textura',
          description: 'Genera volumen físico. El color tiene sentido porque hay altura. No hay trucos visuales.',
        },
        {
          title: 'Colores ilimitados',
          description: 'No hay límites artificiales. Las capas son capas.',
        },
        {
          title: 'Plan de cambios por altura (Z)',
          description: 'Exporta una lista clara de cambios de color para tu slicer. Repetible. Predecible.',
        },
        {
          title: 'Preview por capas',
          description: 'Ves cómo se leen las capas antes de imprimir. Ajustas y listo.',
        },
        {
          title: 'Export STL + Plan de cambios',
          description: 'Tu archivo. Tu slicer. Tu impresora.',
        },
        {
          title: 'Licencia humana',
          description: 'Gratis para siempre. Uso personal y comercial permitido. Sin castigos por crear.',
        },
      ],
    },
    philosophy: {
      title1: 'Una herramienta sencilla',
      titleHighlight: 'no debería costar',
      title2: 'lo mismo que una impresora.',
      subtitle: 'Tampoco debería ponerse rara cuando quieres vender lo que fabricas.',
      quote: 'LayerForge existe porque a veces es más divertido construir una herramienta que discutirla.',
    },
    manifesto: {
      label: 'MANIFIESTO',
      title: 'LayerForge no nace de la rabia. Nace de la curiosidad.',
      line1: 'De preguntarse: "¿Por qué esto es así?"',
      line2: 'Y de una respuesta sencilla: "Nah. I\'ll do it myself."',
      line3: 'No es un ataque. No es una cruzada. Es una sonrisa silenciosa mientras el código compila.',
      quote: '"Nah. I\'ll win."',
    },
    download: {
      label: 'DESCARGA',
      title: 'Gratis para siempre',
      subtitle: 'Si te gusta, apóyanos',
      badge: 'Gratis',
      windows: 'Windows',
      mac: 'macOS',
      linux: 'Linux',
      supportTitle: 'Apoya el proyecto',
      supportDesc: 'LayerForge es gratis, pero puedes ayudarnos a seguir creando:',
      instagram: 'Síguenos en Instagram',
      etsy: 'Visita nuestra tienda en Etsy',
      coffee: 'Invítame a un café',
      note: 'Funciona offline. Sin registro necesario.',
      installTitle: 'Notas de instalación',
      windowsNote: 'Windows puede mostrar "Windows protegió tu PC". Es normal en software independiente. Haz clic en "Más información" y luego en "Ejecutar de todos modos".',
      macNote: 'macOS puede bloquear la app. Haz clic derecho en la app, selecciona "Abrir" y luego "Abrir" en el diálogo. Solo necesitas hacerlo una vez.',
    },
    faq: {
      label: 'FAQ',
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Es un slicer?',
          answer: 'No. LayerForge genera el modelo y el plan de cambios por altura. Luego usas tu slicer habitual.',
        },
        {
          question: '¿Cómo hago los cambios de color?',
          answer: 'Por capa (pausas / color change) o con AMS/MMU/CFS. LayerForge te da las alturas.',
        },
        {
          question: '¿Puedo vender mis impresiones?',
          answer: 'Sí. Ese es literalmente el punto.',
        },
        {
          question: '¿Va a tener suscripción?',
          answer: 'No. Si algún día la tuviera, ya no sería LayerForge.',
        },
        {
          question: '¿Por qué es gratis?',
          answer: 'Porque creemos en construir comunidad. Si te gusta, apóyanos en Instagram o en nuestra tienda de Etsy.',
        },
      ],
    },
    footer: {
      tagline: 'Built out of curiosity.',
      motto: 'Nah. I\'ll win.',
      manifesto: 'Manifiesto',
      support: 'Soporte',
      contact: 'Contacto',
      copyright: '© {year} LayerForge. Hecho con curiosidad.',
      poweredBy: 'Powered by',
      adventureTable: 'Adventure Table',
    },
  },
};
