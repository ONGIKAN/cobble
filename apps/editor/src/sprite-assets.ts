const SPRITE_COLORS = ['#ff6b35', '#4b8bf5', '#9b6ef3', '#2ec4b6', '#ffb600', '#e05780', '#629668', '#ac7c50'];

/** 新角色的占位造型：菱形小脸（直角，符合无圆角约束） */
export function spritePlaceholderSvg(index: number): string {
  const color = SPRITE_COLORS[index % SPRITE_COLORS.length];
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">',
    `<polygon points="48,4 92,48 48,92 4,48" fill="${color}"/>`,
    '<polygon points="48,4 92,48 48,48 4,48" fill="rgba(255,255,255,0.18)"/>',
    '<rect x="30" y="44" width="9" height="12" fill="#1b1d21"/>',
    '<rect x="57" y="44" width="9" height="12" fill="#1b1d21"/>',
    '<rect x="42" y="62" width="12" height="6" fill="#1b1d21"/>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
