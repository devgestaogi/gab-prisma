# Template cartoon-2d-cenario-3d

Personagens 2D chapados (SVG) dentro de cenários 3D procedurais (three), tudo por código, sem imagem de IA.
Câmera que nunca para, fundo desfocado (profundidade de campo fingida), vinheta, grão, inserts de objeto-prova
e transição por obstáculo. Roteiro com `"template": "cartoon-2d-cenario-3d"`. Demo: `roteiros/demo-cartoon.json`.

Arquivos: `Cartoon.tsx` (cena, câmera, grading, obstáculo), `set3d.tsx` (sala, escritório, varanda, porta),
`personagens.tsx` (dono, funcionária, cliente, silhueta), `inserts.tsx` (celular, papel, planilha),
`texturas.ts` (texturas de canvas), `util.ts`.

Campos do roteiro: veja a seção 7 de `DESIGN VIDEOS IA/templates/cartoon-2d-cenario-3d/TEMPLATE.md`.

Rodar: `node ferramentas/alinhar.mjs roteiros/<x>.json <voz>` e `node ferramentas/render.mjs roteiros/<x>.json [saida] [--quadro N]`.
Um quadro leva 2 a 5 s (GPU, `angle`); a demo de 35 s renderiza em ~40 s no Mac.

Regras: determinístico por quadro (sem Math.random), `marca: "gi"` liga o logo nos 3 últimos segundos,
`cores.destaque` colore só o objeto-prova (padrão âmbar `#F2A93B`), sem travessão em texto.

## Modo "planos de imagem" (`planos.tsx`)

O conteúdo da cena pode ser uma imagem gerada do assunto no estilo do template (personagem 2D de contorno grosso em
cenário com volume e luz de cinema). O template só anima por cima. Sem `plano` a cena segue o set 3D + personagens SVG.

- `cena.plano: {imagem, movimento?: "push"|"dolly"|"plongee"|"pan", foco?: [x, y]}`. Imagem em
  `public/<projeto>/planos/`. A normalização, a herança e os segmentos são do mecanismo comum (`../comum`:
  `normPlano`, `segmentosDePlanos`, `planoDisponivel`): só entra imagem que existe (manifesto `dados.planos`; manifesto ausente ou malformado = lista vazia, nenhuma
  imagem; `filme.json` feito à mão precisa trazer `planos`); inexistente ou inválida = não conta. Cena sem `plano` herda o plano da anterior (a 1ª, o da próxima); se NENHUMA cena tem imagem
  válida, o vídeo todo segue o set 3D + personagens SVG. Com plano, a imagem substitui set 3D e personagens; `insert`
  continua por cima. `foco` (0..1, limitado a 0,1..0,9) é o alvo do push e o lado do dolly. Câmera sempre andando devagar e
  sempre cobrindo a tela, com respiração leve.
- `cena.transicao`: entre planos diferentes o padrão é o obstáculo `parede` (forma escura com borda iluminada cruza em 8
  quadros, whoosh baixo). `"corte"` = corte seco. `"obstaculo"` ou `{tipo:"obstaculo", objeto}` escolhe o objeto
  (`parede` no modo planos). Cenas seguidas com a mesma imagem e sem `transicao` formam um segmento só: sem obstáculo e com
  a câmera contínua (movimento e foco da primeira cena, tempo pelo quadro absoluto no segmento inteiro). `transicao`
  explícita encerra o segmento e recomeça a câmera. A imagem de cada segmento é uma camada montada UMA vez, fora das
  `Sequence`s de cena (`CamadaPlano` em `Cartoon.tsx`): a fronteira entre cenas do mesmo segmento não remonta o `Img`.
- `cena.layout: {legenda?: "alto"|"meio"|"baixo", insert?: "alto"|"meio"|"baixo"}`: legenda com centro em 600, 1000
  (padrão) ou 1150; insert na faixa 380..760, 560..1000 (padrão) ou 760..1200. A legenda manda e o insert cede, nesta
  ordem: faixa pedida; a outra região livre (acima ou abaixo da legenda) na mesma escala; só então reduz a escala (piso de
  45%) na região onde ela fica maior; se nem 45% cabe, fica menor no canto livre (piso de 25%); se nem isso, o insert some
  (e o som dele também). Cada passo é validado contra a zona da legenda (`posInsert`), tudo dentro de y 270..1248. Fora do
  modo planos o `layout` só age quando declarado.
- Acabamento: vinheta, véu suave atrás da legenda, grão leve.
- Encaixe do insert: `posInsert` (`planos.tsx`) usa a caixa envolvente REAL do desenho, `caixaDoInsert` (`inserts.tsx`):
  celular com mão, polegar, dedos e balão do contador (só na tela whatsapp com contador > 0), mais a rotação da moldura e o
  balanço de 0,9°. A entrada é só escala (82% a 100%, em torno de 540,760) e opacidade, sem deslocamento vertical e com a mola limitada a 1: em todo o caminho o insert fica dentro dessa caixa. Mudou o desenho do insert, mude a caixa lá: é a fonte única.
- Sons: cada evento leva `ate` (fim da Sequence da cena); `agendaDeSons` descarta o evento que, depois de deslocado, cai em
  `f >= ate` (o ding de uma notificação não toca na cena seguinte). A agenda do vídeo inteiro sai de UMA chamada de `agendaDeSons` (`planejar` em `Cartoon.tsx`), em quadros
  absolutos: whoosh do obstáculo (prioridade 2, fica no quadro do visual), pop na entrada do insert, toque e ding na
  notificação do celular, risco no papel e pop de entrada de personagem (prioridade 1, cedem para frente). Nunca dois
  a menos de 3 quadros um do outro. Volumes 0,35 a 0,5.
- Todo o planejamento (segmentos, fronteiras, agenda) é puro e memorizado por `[dados, fps]` (`planejar`).
