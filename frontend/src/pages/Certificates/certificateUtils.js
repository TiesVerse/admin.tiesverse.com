export const newCertificateVariable = (name) => ({
  name,
  label: name.replaceAll('_', ' '),
  type: 'text',
  required: true,
  default_value: '',
  sample_value: '',
  description: '',
  generator_enabled: false,
  generator_pattern: '',
});

export const newCertificateElement = (pageNumber, zIndex, name = `field_${zIndex}`) => ({
  id: crypto.randomUUID(),
  page_number: pageNumber,
  element_type: 'text',
  content: `{{${name}}}`,
  image_src: null,
  image_alt: null,
  hyperlink_url: '',
  x: 120,
  y: 120,
  width: 260,
  height: 54,
  font_family: 'Helvetica',
  font_size: 28,
  font_weight: '400',
  font_style: 'normal',
  is_bold: false,
  is_italic: false,
  is_underline: false,
  is_strikethrough: false,
  text_color: '#111827',
  background_color: null,
  text_opacity: 1,
  background_opacity: 0,
  text_align: 'center',
  vertical_align: 'middle',
  line_height: 1.2,
  letter_spacing: 0,
  word_spacing: 0,
  text_transform: 'none',
  padding_top: 0,
  padding_right: 0,
  padding_bottom: 0,
  padding_left: 0,
  border_width: 0,
  border_color: '#000000',
  border_style: 'solid',
  border_radius: 0,
  rotation: 0,
  z_index: zIndex,
  locked: false,
  auto_shrink: false,
  clip_overflow: true,
});

export const normalizeCertificateElement = (element) => ({
  ...newCertificateElement(element.page_number || 1, element.z_index || 0),
  ...element,
  id: String(element.id || crypto.randomUUID()),
});

export const variableNamesFromElements = (elements) => {
  const names = new Set();
  elements.forEach((element) => {
    const content = String(element.content || '');
    for (const match of content.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/gi)) {
      names.add(match[1].toLowerCase());
    }
  });
  return [...names].sort();
};

export const mergeCertificateVariables = (variables, elements) => {
  const map = new Map((variables || []).map((variable) => [variable.name, {
    ...newCertificateVariable(variable.name),
    ...variable,
  }]));
  variableNamesFromElements(elements).forEach((name) => {
    if (!map.has(name)) map.set(name, newCertificateVariable(name));
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const fillCertificateVariables = (content, data) => String(content || '').replace(
  /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/gi,
  (_, name) => data[name.toLowerCase()] ?? name.replaceAll('_', ' '),
);

export const normalizeVariableName = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[a-z]/.test(normalized) ? normalized : `field_${normalized || 'value'}`;
};

export const readCsvHeaders = async (file) => {
  const firstLine = (await file.text()).split(/\r?\n/, 1)[0] || '';
  return firstLine.split(',').map((value) => value.trim().replace(/^"|"$/g, '')).filter(Boolean);
};
