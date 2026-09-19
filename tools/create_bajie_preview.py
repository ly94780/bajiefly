"""Build a lightweight animated preview from the current Bajie state sprites."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_DIR = ROOT / "assets/bundles/core/textures/characters/bajie"
BACKGROUND_PATH = (
    ROOT / "assets/bundles/core/textures/environments/tiangong/bg_sky_base.png"
)
OUTPUT_DIR = ROOT / "art_source/previews"
OUTPUT_PATH = OUTPUT_DIR / "player_bajie_animation_preview.gif"

CANVAS_SIZE = (720, 720)
CHARACTER_BOX = (570, 570)
RESAMPLE = Image.Resampling.LANCZOS


def load_trimmed(name: str) -> Image.Image:
    image = Image.open(CHARACTER_DIR / name).convert("RGBA")
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box:
        image = image.crop(alpha_box)
    image.thumbnail(CHARACTER_BOX, RESAMPLE)
    return image


def make_background() -> Image.Image:
    source = Image.open(BACKGROUND_PATH).convert("RGB")
    source_ratio = source.width / source.height
    target_ratio = CANVAS_SIZE[0] / CANVAS_SIZE[1]
    if source_ratio < target_ratio:
        crop_height = int(source.width / target_ratio)
        top = max(0, int(source.height * 0.28 - crop_height / 2))
        top = min(top, source.height - crop_height)
        source = source.crop((0, top, source.width, top + crop_height))
    else:
        crop_width = int(source.height * target_ratio)
        left = (source.width - crop_width) // 2
        source = source.crop((left, 0, left + crop_width, source.height))
    source = source.resize(CANVAS_SIZE, RESAMPLE)
    return ImageEnhance.Brightness(source).enhance(0.93)


def compose(
    background: Image.Image,
    sprite: Image.Image,
    *,
    x_offset: int = 0,
    y_offset: int = 0,
    angle: float = 0.0,
    scale: float = 1.0,
) -> Image.Image:
    current = sprite
    if scale != 1.0:
        size = (
            max(1, round(sprite.width * scale)),
            max(1, round(sprite.height * scale)),
        )
        current = sprite.resize(size, RESAMPLE)
    if angle:
        current = current.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)

    frame = background.copy().convert("RGBA")
    x = (CANVAS_SIZE[0] - current.width) // 2 + x_offset
    y = (CANVAS_SIZE[1] - current.height) // 2 + y_offset
    frame.alpha_composite(current, (x, y))
    return frame.convert("RGB")


def build_animation() -> tuple[list[Image.Image], list[int]]:
    background = make_background()
    idle = load_trimmed("player_bajie_idle.png")
    fly_up = load_trimmed("player_bajie_fly_up.png")
    fall = load_trimmed("player_bajie_fall.png")
    hit = load_trimmed("player_bajie_hit.png")
    result = load_trimmed("player_bajie_result.png")

    frames: list[Image.Image] = []
    durations: list[int] = []

    # Calm hover.
    for index in range(8):
        y = round(math.sin(index / 8 * math.tau) * 8)
        frames.append(compose(background, idle, y_offset=y))
        durations.append(100)

    # Ear-powered climb: alternate the two readable ear poses while moving upward.
    for index in range(12):
        sprite = fly_up if index % 2 == 0 else idle
        y = round(45 - index * 8)
        angle = -3 - index * 0.6
        frames.append(compose(background, sprite, y_offset=y, angle=angle))
        durations.append(80)

    # Short apex transition.
    for index in range(4):
        frames.append(compose(background, idle, y_offset=-48 + index * 4, angle=-8 + index * 3))
        durations.append(90)

    # Free fall accelerates visually.
    for index in range(12):
        progress = index / 11
        y = round(-40 + 180 * progress * progress)
        angle = round(4 + 18 * progress)
        frames.append(compose(background, fall, y_offset=y, angle=angle))
        durations.append(75)

    # Comedic bump with a tiny squash and shake.
    shake = [(-8, 0, 1.04), (8, -4, 1.08), (-5, 3, 1.04), (3, 0, 1.0)]
    for x, y, scale in shake:
        frames.append(compose(background, hit, x_offset=x, y_offset=55 + y, scale=scale))
        durations.append(95)
    frames.append(compose(background, hit, y_offset=55))
    durations.append(260)

    # Tired recovery / result pose.
    for index in range(10):
        y = round(25 + math.sin(index / 10 * math.tau) * 5)
        frames.append(compose(background, result, y_offset=y))
        durations.append(120)
    durations[-1] = 650

    return frames, durations


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    frames, durations = build_animation()
    frames[0].save(
        OUTPUT_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"created={OUTPUT_PATH}")
    print(f"frames={len(frames)}")
    print(f"duration_ms={sum(durations)}")


if __name__ == "__main__":
    main()
