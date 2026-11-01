import './ui/styles.css';
import { SPAWN } from '@vco/shared/world';
import { createRenderer } from './scene/renderer';
import { buildTemple } from './scene/temple';

function fatal(msg: string) {
  const d = document.createElement('div');
  d.className = 'fatal';
  d.textContent = msg;
  document.body.appendChild(d);
}

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createRenderer(canvas);
if (!stage) {
  fatal('Thiết bị hoặc trình duyệt của bạn chưa hỗ trợ đồ hoạ 3D (WebGL). Hãy thử mở bằng Chrome hoặc Safari mới nhất. 🙏');
} else {
  buildTemple(stage.scene);
  stage.camera.position.set(SPAWN.x, 3.2, SPAWN.z + 6);
  stage.camera.lookAt(0, 2, -10);
}
