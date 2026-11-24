// Registro dos templates de edição. O roteiro escolhe pelo campo "template" (o nome da pasta em
// DESIGN VIDEOS IA/templates/); sem o campo, ou com "prisma-3d", o Filme.tsx segue no estilo Prisma.
import React from 'react';
import type {PropsTemplate} from './comum';
import {Diorama} from './diorama/Diorama';
import {Vetor} from './vetor/Vetor';
import {Cartoon} from './cartoon/Cartoon';

export const TEMPLATES: Record<string, React.FC<PropsTemplate>> = {
  'diorama-3d-hud': Diorama,
  'vetor-chapado-contador': Vetor,
  'cartoon-2d-cenario-3d': Cartoon,
};
