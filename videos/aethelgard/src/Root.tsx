import "./index.css";
import { Composition } from "remotion";
import { MysticalVillageComp } from "./MysticalVillageComp";
import { DURATION, FPS, HEIGHT, WIDTH } from "./shared";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MysticalVillage"
      component={MysticalVillageComp}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
