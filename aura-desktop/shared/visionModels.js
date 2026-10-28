const VISION_MODEL_PATTERN = /(?:gemma3|gemma3n|llava|qwen2\.5-vl|qwen3-vl|minicpm-v|moondream|llama3\.2-vision|mistral-small3)/i;

/** Pick a locally installed model known to accept images, preferring the current choice. */
export function findVisionModel(models = [], preferred = '') {
  const names = models.map((model) => typeof model === 'string' ? model : model?.name).filter(Boolean);
  const selected = names.find((name) => name === preferred || name.startsWith(`${preferred}:`));
  if (selected && VISION_MODEL_PATTERN.test(selected)) return selected;
  return names.find((name) => VISION_MODEL_PATTERN.test(name)) || null;
}
