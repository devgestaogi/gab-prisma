// Render no Mac: o template diorama-3d-hud usa WebGL (three.js). Com "angle" o Chrome do Remotion usa a GPU
// do Mac; sem isso o 3D sai por software (lento) ou em branco.
import {Config} from '@remotion/cli/config';
Config.setChromiumOpenGlRenderer('angle');
