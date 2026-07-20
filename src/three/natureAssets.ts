/**
 * Theme nature packs: painted ground + billboard sprites per place mood.
 * Call setNatureTheme(theme) when entering a scene so props pick the right art.
 * Leave Globe / SolarSystem alone - those stay procedural.
 */
import * as THREE from "three";

export type NatureThemeId =
  | "lush"
  | "desert"
  | "savanna"
  | "snow"
  | "rock"
  | "coast"
  | "reef"
  | "olive"
  | "plaza";

export type NatureSpriteKind =
  | "tree"
  | "palm"
  | "bush"
  | "rock"
  | "mushroom"
  | "grass"
  | "flowers"
  | "cactus"
  | "coral"
  | "kelp"
  | "acacia"
  | "cherry"
  | "cypress";

interface ThemePack {
  ground: string;
  groundRepeat: number;
  tint: number;
  sprites: Partial<Record<NatureSpriteKind, string>>;
}

const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
const matCache = new Map<string, THREE.Material>();

let currentTheme: NatureThemeId = "lush";

const LUSH_SPRITES: Record<NatureSpriteKind, string> = {
  tree: "nature/sprites/tree-oak.png",
  palm: "nature/sprites/tree-palm.png",
  bush: "nature/sprites/bush-flowers.png",
  rock: "nature/sprites/rock-moss.png",
  mushroom: "nature/sprites/mushroom.png",
  grass: "nature/sprites/grass-tuft.png",
  flowers: "nature/sprites/flowers-cluster.png",
  cactus: "nature/sprites/cactus.png",
  coral: "nature/sprites/coral-cluster.png",
  kelp: "nature/sprites/kelp-seaweed.png",
  acacia: "nature/sprites/tree-acacia.png",
  cherry: "nature/sprites/tree-cherry.png",
  cypress: "nature/sprites/tree-cypress.png",
};

export const THEME_PACKS: Record<NatureThemeId, ThemePack> = {
  lush: {
    ground: "nature/textures/grass-eden.jpg",
    groundRepeat: 12,
    tint: 0xffffff,
    sprites: { ...LUSH_SPRITES },
  },
  desert: {
    ground: "nature/textures/ground-desert.jpg",
    groundRepeat: 10,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-palm.png",
      palm: "nature/sprites/tree-palm.png",
      bush: "nature/sprites/bush-desert.png",
      rock: "nature/sprites/rock-sandstone.png",
      grass: "nature/sprites/grass-dry.png",
      flowers: "nature/sprites/flowers-desert.png",
    },
  },
  savanna: {
    ground: "nature/textures/ground-savanna.jpg",
    groundRepeat: 10,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-acacia.png",
      acacia: "nature/sprites/tree-acacia.png",
      bush: "nature/sprites/bush-desert.png",
      rock: "nature/sprites/rock-sandstone.png",
      grass: "nature/sprites/grass-dry.png",
      flowers: "nature/sprites/flowers-desert.png",
    },
  },
  snow: {
    ground: "nature/textures/ground-snow.jpg",
    groundRepeat: 9,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-night.png",
      bush: "nature/sprites/bush-flowers.png",
      rock: "nature/sprites/rock-coastal.png",
      grass: "nature/sprites/grass-tuft.png",
      flowers: "nature/sprites/flowers-night.png",
    },
  },
  rock: {
    ground: "nature/textures/ground-sinai.jpg",
    groundRepeat: 9,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-night.png",
      bush: "nature/sprites/bush-desert.png",
      rock: "nature/sprites/rock-sandstone.png",
      grass: "nature/sprites/grass-dry.png",
    },
  },
  coast: {
    ground: "nature/textures/ground-sea.jpg",
    groundRepeat: 10,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-palm.png",
      palm: "nature/sprites/tree-palm.png",
      bush: "nature/sprites/bush-desert.png",
      rock: "nature/sprites/rock-coastal.png",
      grass: "nature/sprites/grass-dry.png",
    },
  },
  reef: {
    ground: "nature/textures/ground-reef.jpg",
    groundRepeat: 8,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      bush: "nature/sprites/kelp-seaweed.png",
      rock: "nature/sprites/rock-coastal.png",
      coral: "nature/sprites/coral-cluster.png",
      kelp: "nature/sprites/kelp-seaweed.png",
    },
  },
  olive: {
    ground: "nature/textures/ground-canaan.jpg",
    groundRepeat: 11,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-olive.png",
      cypress: "nature/sprites/tree-cypress.png",
    },
  },
  plaza: {
    ground: "nature/textures/stone-path.jpg",
    groundRepeat: 8,
    tint: 0xffffff,
    sprites: {
      ...LUSH_SPRITES,
      tree: "nature/sprites/tree-olive.png",
      bush: "nature/sprites/bush-flowers.png",
      rock: "nature/sprites/rock-moss.png",
    },
  },
};

/** Map diorama biomes → nature theme packs. */
export function themeForBiome(
  biome: "grass" | "sand" | "snow" | "savanna" | "rock"
): NatureThemeId {
  switch (biome) {
    case "sand":
      return "desert";
    case "snow":
      return "snow";
    case "savanna":
      return "savanna";
    case "rock":
      return "rock";
    default:
      return "lush";
  }
}

/** Map landmark ground kinds → nature theme packs. */
export function themeForLandmarkGround(
  ground: "sand" | "grass" | "snow" | "stone" | "savanna" | "plaza" | "ice"
): NatureThemeId {
  switch (ground) {
    case "sand":
      return "desert";
    case "snow":
    case "ice":
      return "snow";
    case "savanna":
      return "savanna";
    case "stone":
      return "rock";
    case "plaza":
      return "plaza";
    default:
      return "lush";
  }
}

export function setNatureTheme(themeName: string): NatureThemeId {
  currentTheme = (THEME_PACKS[themeName as NatureThemeId] ? themeName : "lush") as NatureThemeId;
  return currentTheme;
}

export function getNatureTheme(): NatureThemeId {
  return currentTheme;
}

function pack(): ThemePack {
  return THEME_PACKS[currentTheme] || THEME_PACKS.lush;
}

function spriteRel(kind: NatureSpriteKind): string | null {
  const p = pack();
  return p.sprites[kind] || LUSH_SPRITES[kind] || null;
}

function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}assets/${rel}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

function loadTex(rel: string, { repeat = 1 } = {}): THREE.Texture {
  const key = `${rel}|${repeat}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const tex = loader.load(assetUrl(rel));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

function loadSpriteTex(rel: string): THREE.Texture {
  const key = `spr:${rel}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const tex = loader.load(assetUrl(rel));
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

/** Theme → ground texture + tint. */
export function groundTextureForTheme(themeName?: string): {
  map: THREE.Texture;
  tint: number;
  repeat: number;
} {
  const name = (THEME_PACKS[themeName as NatureThemeId] ? themeName : currentTheme) as NatureThemeId;
  const p = THEME_PACKS[name] || THEME_PACKS.lush;
  return {
    map: loadTex(p.ground, { repeat: p.groundRepeat }),
    tint: p.tint,
    repeat: p.groundRepeat,
  };
}

function spriteMat(kind: NatureSpriteKind): THREE.SpriteMaterial | null {
  const rel = spriteRel(kind);
  if (!rel) return null;
  const key = `sprMat:${currentTheme}:${kind}`;
  const cached = matCache.get(key);
  if (cached) return cached as THREE.SpriteMaterial;
  const m = new THREE.SpriteMaterial({
    map: loadSpriteTex(rel),
    transparent: true,
    depthWrite: false,
    alphaTest: 0.15,
  });
  matCache.set(key, m);
  return m;
}

export function natureSprite(
  kind: NatureSpriteKind,
  size = 2,
  opts: { widthScale?: number; y?: number; tint?: number; uniqueMat?: boolean } = {}
): THREE.Sprite | null {
  const m = spriteMat(kind);
  if (!m) return null;
  const s = new THREE.Sprite(opts.uniqueMat ? m.clone() : m);
  const h = size;
  const w = size * (opts.widthScale || 0.85);
  s.scale.set(w, h, 1);
  s.center.set(0.5, 0);
  s.position.y = opts.y ?? 0;
  s.name = "noshadow";
  if (opts.tint != null) {
    s.material = m.clone();
    s.material.color = new THREE.Color(opts.tint);
  }
  return s;
}

export function natureBillboard(
  kind: NatureSpriteKind,
  size = 2,
  opts: { widthScale?: number; tint?: number; sway?: number } = {}
): THREE.Group | null {
  const rel = spriteRel(kind);
  if (!rel) return null;
  const tex = loadSpriteTex(rel);
  const matKey = `bb:${currentTheme}:${kind}`;
  let m = matCache.get(matKey) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    matCache.set(matKey, m);
  }
  const g = new THREE.Group();
  const h = size;
  const w = size * (opts.widthScale || 0.75);
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const a = new THREE.Mesh(geo, m);
  const b = new THREE.Mesh(geo, m);
  b.rotation.y = Math.PI / 2;
  a.name = b.name = "noshadow";
  g.add(a, b);
  if (opts.tint != null) {
    const tinted = m.clone();
    tinted.color = new THREE.Color(opts.tint);
    a.material = tinted;
    b.material = tinted;
  }
  g.userData.sway = { node: g, ph: Math.random() * 10, amt: opts.sway ?? 0.02 };
  return g;
}

export function hasNatureSprite(kind: NatureSpriteKind): boolean {
  return Boolean(spriteRel(kind));
}

/** Painted ground disc (circle) for stages / floors. */
export function paintedGroundDisc(
  radius: number,
  themeName?: string,
  opts: { segments?: number; y?: number } = {}
): THREE.Mesh {
  const { map, tint } = groundTextureForTheme(themeName);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: tint,
    roughness: 0.95,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, opts.segments ?? 40),
    mat
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = opts.y ?? 0;
  return mesh;
}

/** Painted cylinder top for floating-island diorama grounds. */
export function paintedGroundCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  themeName?: string,
  opts: { segments?: number } = {}
): THREE.Mesh {
  const { map, tint } = groundTextureForTheme(themeName);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: tint,
    roughness: 1,
    flatShading: true,
  });
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, opts.segments ?? 24),
    mat
  );
}
