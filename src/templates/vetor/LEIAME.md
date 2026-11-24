# Template vetor-chapado-contador (motor gab-prisma)

Ilustração vetorial chapada, tudo desenhado por código (SVG em React), sem imagem gerada por IA.
Roteiro com `"template": "vetor-chapado-contador"` é despachado pelo `src/Filme.tsx` para `Vetor.tsx`.

| arquivo | o que faz |
|---|---|
| `Vetor.tsx` | monta cada cena (palco com deriva de câmera, elementos, legenda, sons, logo) e o título fixo |
| `Cenarios.tsx` | `rua`, `escritorio` (`noite: true` opcional), `loja` (`placa` opcional), `cidade-noite`, `casa-noite`, `estrada`, `liso`; ou `imagem` |
| `Personagem.tsx` | dono, funcionaria, funcionario, cliente; expressões e animações; estilo `contorno` ou `liso` |
| `Objetos.tsx` | celular, agenda, relogio, relogio-duplo, cofre, tomada, porta, moedas, caixa, grafico |
| `Elementos.tsx` | título fixo, selo, contador, balão, impacto, flash, HUD (mira, visor, radar), CTA |
| `util.ts` | tipos do roteiro, cores, gerador com semente, constantes da faixa útil |

Campos do roteiro: seção 7 de `DESIGN VIDEOS IA/templates/vetor-chapado-contador/TEMPLATE.md`.
Exemplo completo: `roteiros/demo-vetor.json`.

Regras de código: tudo determinístico por quadro (sem `Math.random`); texto só em Oswald embutida
(`<Fontes/>` de `comum.tsx`); nada importante fora da faixa útil (topo 270, base 1248, laterais 65).
Cenário de imagem: `cenario: {"imagem": "arquivo.png"}` lê `public/<projeto>/cenarios/arquivo.png`.
