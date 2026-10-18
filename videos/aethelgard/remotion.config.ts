import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
// WebGL needs a real GPU-backed context in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");
// Each tab owns a WebGL context with bloom + reflection targets; keep VRAM in check.
Config.setConcurrency(2);
Config.overrideWebpackConfig((config) => enableTailwind(config));
