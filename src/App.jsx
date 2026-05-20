import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// TIKTOK SHOP — MODO ULTRA CONVERTER MILHÕES
// OpenRouter · Grok · Gemini
// POV 10S · Coringa · Hooks 12 Padrões · Villain · Meta · Veo3
// Agent Finder · Escala CBO · Shield v3
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// APIs
// ───────────────────────────────────────────────────────────────

const PROVIDERS = {
  openrouter: {
    name: "⚡ OpenRouter",
    free: true,
    keyUrl: "https://openrouter.ai/settings/keys",
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash ✨ RECOMENDADO", free: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Grátis)", free: true },
      { id: "meta-llama/llama-4-maverick:free", name: "Llama 4 Maverick (Grátis)", free: true },
      { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small (Grátis)", free: true },
    ],
  },
  grok: {
  name: "🤖 Grok (xAI)",
  free: false,
  keyUrl: "https://console.x.ai",
  models: [
    { id: "grok-4", name: "Grok 4 ✨ NOVO" },
    { id: "grok-3", name: "Grok 3" },
    { id: "grok-3-mini", name: "Grok 3 Mini" },
    { id: "grok-beta", name: "Grok Beta" },
  ],
},
  gemini: {
    name: "🆓 Gemini (Google)",
    free: true,
    keyUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash ✨ RECOMENDADO", free: true },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", free: true },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", free: true },
    ],
  },
};

async function callOpenRouter(key, model, system, user, temp = 0.9) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "TikTok Ultra Converter",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp,
      max_tokens: 6000,
    }),
  });
  if (!r.ok) throw new Error((await r.json()).error?.message || "Erro OpenRouter");
  return (await r.json()).choices[0].message.content;
}

async function callGrok(key, model, system, user, temp = 0.9) {
  const r = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-4",
      max_output_tokens: 8000,
      input: `${system}\n\n${user}`,
    }),
  });

  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error?.message || `Erro Grok ${r.status}`);
  }

  const data = await r.json();

  try {
    if (data.output) {
      for (const block of data.output) {
        if (block.type === "message" && block.content) {
          for (const c of block.content) {
            if (c.type === "output_text" && c.text) return c.text;
          }
        }
      }
    }
    if (data.output_text) return data.output_text;
    if (data.content?.[0]?.text) return data.content[0].text;
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    throw new Error("Resposta vazia do Grok");
  } catch (e) {
    throw new Error("Erro ao processar resposta: " + e.message);
  }
}

async function callGemini(key, model, system, user, temp = 0.9) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { temperature: temp, maxOutputTokens: 8000 },
      }),
    }
  );
  if (!r.ok) throw new Error((await r.json()).error?.message || "Erro Gemini");
  return (await r.json()).candidates[0].content.parts[0].text;
}

async function callAPI(provider, key, model, system, user, temp = 0.9) {
  const fns = { openrouter: callOpenRouter, grok: callGrok, gemini: callGemini };
  return fns[provider](key, model, system, user, temp);
}

async function callJSON(provider, key, model, system, user, temp = 0.9) {
  const txt = await callAPI(
    provider, key, model,
    system + "\n\n⚠️ CRÍTICO: RESPONDA APENAS JSON PURO. SEM ```json SEM markdown SEM texto antes ou depois.",
    user, temp
  );
  let c = txt.replace(/```json|```/gi, "").trim();
  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s !== -1 && e !== -1) c = c.substring(s, e + 1);
  try { return JSON.parse(c); }
  catch {
    c = c.replace(/[""]/g, '"').replace(/[\u0000-\u001F]/g, "");
    return JSON.parse(c);
  }
}

// ───────────────────────────────────────────────────────────────
// DADOS
// ───────────────────────────────────────────────────────────────

const CATS = [
  "Beleza e cuidados pessoais","Saúde","Moda feminina","Moda masculina",
  "Casa e jardim","Esportes","Eletrônicos","Bebê e maternidade","Pet",
  "Alimentos e bebidas","Skincare","Maquiagem","Suplementos","Fitness",
  "Cuidados com cabelo","Joias e acessórios","Decoração","Tecnologia","Outro",
];

// ───────────────────────────────────────────────────────────────
// BLINDADOR
// ───────────────────────────────────────────────────────────────

const BLINDADOR = `
🛡️ BLINDADOR ULTRA v3 — COMPLIANCE TIKTOK SHOP BR:

PROIBIDO ABSOLUTO:
❌ "remove","cura","elimina","100%","garantido","milagre","emagrece",
"queima gordura","seca barriga","detox","trata doença","efeito botox",
"regenera","anti-inflamatório","médicos odeiam","antes e depois",
"perda de peso","redução de gordura","segredo proibido"

SUBSTITUIÇÕES OBRIGATÓRIAS:
"remove rugas" → "ajuda na aparência"
"cura acne" → "auxilia nos cuidados"
"emagrece" → "complementa rotina saudável"
"elimina manchas" → "clareia gradualmente"
"cresce cabelo" → "fortalece os fios"

LINGUAGEM OBRIGATÓRIA:
✅ "tenho usado","gostei","na minha rotina","percebi","textura",
"sensação","após algumas semanas","pode ajudar","auxilia","contribui"

REGRAS TÉCNICAS:
✅ CTA: SEMPRE "carrinho laranja" (NUNCA "amarelo" ou outras cores)
✅ Timeframes: mínimo 2-3 semanas
✅ Tom: experiência pessoal, NUNCA promessa absoluta
✅ NUNCA mencionar outras plataformas (Shopee, Amazon, Instagram, link na bio)
✅ Compra SEMPRE pelo carrinho laranja do TikTok

CRÍTICO: NÃO-NEGOCIÁVEL EM TODOS OS OUTPUTS!
`;

// ───────────────────────────────────────────────────────────────
// PROMPTS
// ───────────────────────────────────────────────────────────────

const BASE = `Você é especialista em TikTok Shop Brasil, copywriting de alta conversão e hooks científicos testados com $1M+.
COMPLIANCE: ❌ NUNCA: "remove","cura","elimina","100%","garantido","emagrece"
✅ SEMPRE: "ajuda","auxilia","melhora","contribui","fortalece"
CTA: SEMPRE "carrinho laranja". Tom: português BR coloquial. Experiência pessoal, não promessa.
RESPONDA APENAS JSON PURO, sem markdown, sem backticks.`;

const PROMPT_POV = (lim, qty) => BASE + `

FORMATO POV 10S — O QUE MAIS VENDE NO TIKTOK SHOP:
Vídeo 8-10 segundos. Pessoa segura produto na mão.
Hook = texto na tela + narrado nos primeiros 2s.
SEO keyword falada E escrita nos primeiros 2s.
Loop perfeito: fim conecta com início.

LIMITE: MÁXIMO ${lim} PALAVRAS faladas/tela.

JSON:
{
  "videos_pov": [
    {
      "numero": 1,
      "padrao_hook": "Inversão Vilão",
      "keyword_seo": "keyword buscada no TikTok",
      "hook_texto_tela": "texto na tela máx 12 palavras",
      "hook_narrado": "o que falar nos primeiros 2s com keyword",
      "body_visual": "o que fazer com produto na mão (2-7s)",
      "body_narrado": "o que falar enquanto mostra",
      "cta": "carrinho laranja 🛒",
      "legenda": "legenda SEO com keyword máx 15 palavras",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
      "total_palavras": ${lim},
      "duracao": "8-10s",
      "loop": "como fazer o loop perfeito",
      "gatilho_usado": "nome do gatilho psicológico",
      "por_que_converte": "explicação em 1 linha"
    }
  ]
}
Gere EXATAMENTE ${qty} vídeos POV com padrões de hook DIFERENTES.`;

const PROMPT_CORINGA = (lim, qty) => BASE + `

FORMATO CORINGA — BASEADO EM VÍDEOS REAIS (214k, 84k, 70k, 11k views):
Exemplo 214k: "não marca não fica transparente e ainda modela o corpo short duplo drift fit original por menos de 30 reais clica no carrinho laranja antes que acabe"
Exemplo 84k: "short duplo drift original cintura alta não transparece no agachamento segura a barriga menos de trinta reais clica no carrinho laranja antes de acabar"

ESTRUTURA OBRIGATÓRIA:
1. NEGATIVAS (3-4 objeções destruídas)
2. PRODUTO + ORIGINAL
3. PREÇO ÂNCORA "por menos de X reais"
4. CTA + URGÊNCIA "carrinho laranja antes que acabe"

LIMITE: MÁXIMO ${lim} PALAVRAS. Tom rápido, sem vírgulas em excesso.

JSON:
{
  "formato_coringa": [
    {
      "numero": 1,
      "texto_completo": "script completo para falar/texto na tela",
      "negativas_usadas": ["não X","não Y","não Z"],
      "preco_ancora": "menos de X reais",
      "urgencia": "antes que acabe",
      "total_palavras": ${lim},
      "duracao": "8-10s",
      "inspirado_em": "214k views",
      "quando_usar": "contexto ideal"
    }
  ]
}
Gere EXATAMENTE ${qty} variações DIFERENTES. Varie negativas, ângulo, urgência, âncora.`;

const PROMPT_HOOKS = (lim, qty) => BASE + `

OS 12 PADRÕES MILIONÁRIOS VALIDADOS:

1. INTERRUPÇÃO DE PADRÃO — Conversão 8.5%
Estrutura: "[Ação inesperada] + [Benefício oculto]"
Exemplo: "Eu tava jogando isso fora até descobrir..."

2. DOR INVISÍVEL — Conversão 9.2%
Estrutura: "Se [sintoma sutil], você tem [problema sério]"
Exemplo: "Se você acorda cansada mesmo dormindo 8h..."

3. TIMING CRÍTICO — Conversão 12.3%
Estrutura: "[Grupo] tem até [deadline] para [ação]"
Exemplo: "Se você tem mais de 30, próximos 15 dias..."

4. INVERSÃO VILÃO — Conversão 15.7%
Estrutura: "[Solução vendida] é o problema"
Exemplo: "Seu hidratante tá ressecando sua pele..."

5. PROVA SOCIAL EXTREMA — Conversão 10.2%
Estrutura: "[Número massivo] + [Ação] + [Resultado]"
Exemplo: "217 mil pessoas pararam de usar..."

6. DESCOBERTA CIENTÍFICA — Conversão 11.8%
Estrutura: "Estudo comprovou: [fato chocante]"
Exemplo: "Pesquisa: 73% usam hidratante errado..."

7. ERRO COMUM FATAL — Conversão 13.8%
Estrutura: "Todo mundo faz e tá destruindo [resultado]"
Exemplo: "Você tá lavando o rosto errado..."

8. TRANSFORMAÇÃO IMEDIATA — Conversão 14.5%
Estrutura: "Em [tempo curto] isso aconteceu"
Exemplo: "3 dias usando e minha pele mudou..."

9. SEGREDO DE INSIDER — Conversão 16.2%
Estrutura: "[Profissional] não quer que saiba"
Exemplo: "Dermatologista revelou: não precisa gastar R$300..."

10. COMPARAÇÃO CHOCANTE — Conversão 10.8%
Estrutura: "Custa menos que [banal] e faz [incrível]"
Exemplo: "Menos que um açaí e sua pele muda..."

11. PROBLEMA TRIPLO — Conversão 12.5%
Estrutura: "Se tem [P1], [P2] e [P3]..."
Exemplo: "Pele oleosa, acne e manchas? Resolve os 3..."

12. PERGUNTA IMPOSSÍVEL — Conversão 13.1%
Estrutura: "Por que [ruim] se você faz [certo]?"
Exemplo: "Por que a pele fica oleosa se você lava 3x?"

FÓRMULAS MATEMÁTICAS:
F1 — DOR+AMPLIFICAÇÃO (8.5%): "[Problema] + [Consequência] + [Até quando]"
F2 — EXCLUSIVIDADE+URGÊNCIA (12.3%): "[Grupo] + [Janela] + [Ação]"
F3 — INVERSÃO+REVELAÇÃO (15.7%): "[Crença] + [É falsa] + [Verdade]"
F4 — NÚMERO+PROVA (10.2%): "[Número] + [Pessoas/Dias] + [Resultado]"
F5 — PERGUNTA+DOR (13.8%): "Por que [ruim] + se [ação certa]?"

ANATOMIA DO HOOK:
[0.0-0.5s] GATILHO EMOCIONAL
[0.5-1.0s] CONTEXTO ESPECÍFICO
[1.0-1.5s] PROMESSA/CURIOSIDADE
[1.5-2.0s] BRIDGE PRO CONTEÚDO

MÉTRICAS:
Hook Ruim: CTR <5% · Retenção <30%
Hook Médio: CTR 5-8% · Retenção 30-50%
Hook Bom: CTR 8-12% · Retenção 50-70%
Hook Campeão: CTR >12% · Retenção >70%
Hook Milionário: CTR >15% · Retenção >80%

LIMITE: MÁXIMO ${lim} PALAVRAS por hook.

JSON:
{
  "hooks": [
    {
      "numero": 1,
      "padrao": "Inversão Vilão",
      "formula_usada": "F3 — INVERSÃO+REVELAÇÃO",
      "hook_texto_tela": "texto na tela máx 12 palavras",
      "hook_narrado": "versão falada com keyword",
      "keyword_integrada": "keyword SEO usada",
      "score_probabilidade": 92,
      "ctr_esperado": "14-17%",
      "retencao_esperada": "75%+",
      "classificacao": "🏆 Hook Milionário",
      "conversao_media": "15.7%",
      "gatilho_psicologico": "nome do gatilho",
      "por_que_para_scroll": "explicação científica em 1 linha",
      "variacao_1": "primeira variação mantendo padrão",
      "variacao_2": "segunda variação",
      "variacao_3": "terceira variação",
      "quando_usar": "contexto ideal",
      "nicho_ideal": "beleza / saúde / moda / todos"
    }
  ]
}
Gere EXATAMENTE ${qty} hooks usando padrões DIFERENTES dos 12 acima.
Use pelo menos 8 padrões diferentes. Ordene por score_probabilidade decrescente.`;

const PROMPT_VILLAIN = (lim, qty) => BASE + `

ROTEIRO VILLAIN VS HERO — Para produtos que precisam de explicação (15-20s).
ESTRUTURA: Hook(0-2s) → Villain(2-6s) → Hero(6-12s) → Proof(12-17s) → CTA(17-20s)
SEO: keyword falada E escrita nos primeiros 2s.
LIMITE: MÁXIMO ${lim} PALAVRAS no roteiro narrado.

JSON:
{
  "roteiros_villain_hero": [
    {
      "numero": 1,
      "keyword_seo": "keyword buscada",
      "pov_hook_tela": "texto na tela máx 10 palavras",
      "roteiro_narrado": "roteiro completo máx ${lim} palavras terminando em carrinho laranja",
      "villain": "o problema que agita a dor",
      "hero": "como o produto resolve",
      "proof": "prova/experiência pessoal compliance",
      "legenda_seo": "legenda com keyword máx 15 palavras",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
      "duracao": "15-20s",
      "quando_usar": "contexto ideal"
    }
  ]
}
Gere EXATAMENTE ${qty} roteiros DIFERENTES.`;

const PROMPT_META = (lim, qty) => BASE + `

META ADS — 5 hooks que mais convertem com $1M+ testado:
1. Problema Salvo: "Esse [produto] salvou minha [situação]"
2. Nunca Experimentei: "Nunca pensei que ia gostar até..."
3. Prova Social Terceiros: "Minha [relação] me indicou..."
4. E Se Eu Dissesse: "E se eu dissesse que [benefício] por menos de [preço]?"
5. Tentei Tudo: "Tentei tudo para [problema] até descobrir..."

LIMITE: MÁXIMO ${lim} PALAVRAS por script.

JSON:
{
  "meta_hooks": [
    {
      "numero": 1,
      "nome": "Problema Salvo",
      "hook_principal": "primeira frase que para o scroll",
      "script_completo": "script completo máx ${lim} palavras",
      "variacoes_dor": ["variação 1","variação 2","variação 3"],
      "instrucao_avatar": "como falar/agir no vídeo",
      "nivel_conversao": "MÁXIMO"
    }
  ],
  "estrategia_teste": {
    "ordem_teste": "qual testar primeiro",
    "como_escalar": "como escalar o vencedor"
  }
}
Gere EXATAMENTE ${qty} hooks usando os 5 padrões.`;

const PROMPT_VEO = (lim, qty) => BASE + `

VEO 3 — Scripts UGC para influencer virtual brasileira.
Tom: natural, conversacional, brasileiro autêntico.
Estilo: influencer real falando para câmera com produto na mão.
LIMITE: MÁXIMO ${lim} PALAVRAS. Sem storytelling complexo. Sem antes/depois.

JSON:
{
  "scripts_veo": [
    {
      "numero": 1,
      "tom_emocional": "natural",
      "script": "o que a influencer fala",
      "descricao_visual": "o que ela faz enquanto fala",
      "palavras": 25,
      "prompt_negativo": "sem texto, sem legendas, sem logos, sem distorções, sem mudanças de roupa, sem distorção facial, sem mudanças no fundo, sem movimentos bruscos"
    }
  ]
}
TONS: natural, excited, sincera, confiante, amigável, descoberta.
Gere EXATAMENTE ${qty} scripts com tons DIFERENTES.`;

const PROMPT_ESCALA = (lim, qty) => BASE + `

ESCALA CIENTÍFICA CBO — Multiplica scripts vencedores.
Metodologia: testa 100 → 10 vendem → 3 explodem.

MANTER IGUAL: estrutura, padrão hook, tom, CTA "carrinho laranja", máx ${lim} palavras.
VARIAR APENAS:
🔄 Pain language (descamando → ardendo → irritando)
🔄 Emotion words (salvou → resolveu → mudou)
🔄 Result description (lisinha → hidratada → renovada)
🔄 Timeframes (2 semanas → 15 dias → 1 mês)
🔄 Social proof (eu → minha irmã → 5 mil mulheres)
🔄 Price anchors (R$60 → menos de 60 → só 60 reais)

JSON:
{
  "analise": {
    "padrao_detectado": "padrão identificado",
    "estrutura": "estrutura do script",
    "tom_emocional": "tom identificado",
    "total_palavras": ${lim},
    "gatilho_principal": "gatilho usado"
  },
  "variacoes": [
    {
      "numero": 1,
      "tipo_variacao": "Pain Language",
      "hook_texto": "hook variado",
      "roteiro": "roteiro variado máx ${lim} palavras",
      "legenda": "legenda SEO variada",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
      "o_que_mudou": "original → variado"
    }
  ]
}
Gere EXATAMENTE ${qty} variações.`;

const PROMPT_AGENT = () => BASE + `

AGENT FINDER 2.0 — Produtos vencedores via Kalodata.

CÁLCULOS:
- Receita/criador = GMV ÷ criadores
- Comissão/venda = Preço × taxa comissão
- ROI mês = Comissão/venda × 30 × 30

SCORE: (Conversão×0.30)+(Crescimento×0.25)+(Comissão×0.20)+(Receita/criador×0.15)+(Criadores×0.10)

CLASSIFICAÇÃO:
90-100: 🏆 OURO ESCONDIDO
75-89: 🔥 CAVALO DE GUERRA
60-74: 💥 FOGUETE
40-59: ✅ VIÁVEL
0-39: 🔴 IGNORAR

JSON:
{
  "produtos": [
    {
      "nome": "nome completo",
      "categoria": "categoria",
      "valor": 49.90,
      "gmv": "R$54.280",
      "conversao": 80.85,
      "criadores": 47,
      "comissao_percentual": 15,
      "crescimento": 89.2,
      "receita_por_criador": 1155,
      "comissao_por_venda": 7.49,
      "roi_mes_30_vendas": 6741,
      "score": 99,
      "classificacao": "🏆 OURO ESCONDIDO",
      "por_que": "motivo do score",
      "red_flags": [],
      "path_10k": "X vendas/dia × R$Y = R$10k/mês",
      "descricao_produto": "descrição atrativa",
      "angulos_matadores": ["ângulo 1","ângulo 2","ângulo 3"],
      "hooks_prontos": ["hook 1","hook 2","hook 3"],
      "creators_data": "X creators | GMV R$Xk | Conv X%"
    }
  ],
  "top_3": [
    {"posicao":1,"nome":"...","score":99,"recomendacao":"VENDER AGORA!"},
    {"posicao":2,"nome":"...","score":96,"recomendacao":"SEGUNDA PRIORIDADE"},
    {"posicao":3,"nome":"...","score":94,"recomendacao":"TESTE PARALELO"}
  ],
  "resumo": {"total_analisados":0,"ouro":0,"cavalo":0,"foguete":0,"viavel":0,"ignorar":0}
}`;

const PROMPT_SHIELD = () => BASE + `

SHIELD v3 — Compliance TikTok Shop BR. Analise em 7 categorias:
1. Palavras proibidas (remove, cura, elimina, emagrece...)
2. Redirecionamento externo (Shopee, Amazon, Instagram, link na bio...)
3. Produtos proibidos (emagrecimento, perda de peso...)
4. Claims cosméticos indevidos (trata, previne, cura doenças...)
5. Promessas exageradas (antes/depois, números absolutos...)
6. Tom médico/clínico
7. CTA incorreto (não usa "carrinho laranja")

SCORE: 100=perfeito · 80-99=ajuste · 60-79=atenção · 0-59=risco ban
NÍVEL: VERDE=80+ · AMARELO=60-79 · VERMELHO=0-59

JSON:
{
  "score_seguranca": 85,
  "nivel_risco": "VERDE",
  "aprovado": true,
  "violacoes": [
    {"tipo":"...","trecho":"...","gravidade":"ALTA","sugestao":"..."}
  ],
  "pontos_positivos": ["..."],
  "texto_corrigido": "...",
  "resumo": "..."
}`;

// ───────────────────────────────────────────────────────────────
// DESIGN
// ───────────────────────────────────────────────────────────────

const C = {
  bg:"#000", card:"#090909", card2:"#111",
  border:"#1e1e1e", borderHover:"#2a2a2a",
  text:"#f0ece4", textDim:"#555", textMid:"#888",
  gold:"#ffd700", goldDim:"#ffd70012",
  accent:"#ff1493", accentDim:"#ff149312",
  success:"#00ff88", successDim:"#00ff8812",
  warning:"#ff9800", warningDim:"#ff980012",
  info:"#00bfff", infoDim:"#00bfff12",
  purple:"#a855f7", purpleDim:"#a855f712",
};

const inp = (ex={}) => ({
  width:"100%", boxSizing:"border-box", background:C.card2,
  border:`1px solid ${C.border}`, borderRadius:10,
  padding:"12px 16px", color:C.text, fontSize:14,
  fontFamily:"inherit", outline:"none", ...ex,
});

const btn = (off=false, cor=C.gold) => ({
  background: off?"#111":cor, border:"none", borderRadius:10,
  padding:"12px 20px", color: off?C.textDim:"#000",
  fontSize:13, fontWeight:700, cursor: off?"not-allowed":"pointer",
  fontFamily:"inherit", opacity: off?0.5:1, transition:"all 0.2s",
  whiteSpace:"nowrap",
});

// ───────────────────────────────────────────────────────────────
// COMPONENTES
// ───────────────────────────────────────────────────────────────

function Badge({children, color=C.gold}){
  return(
    <span style={{fontSize:9,color,background:color+"15",border:`1px solid ${color}30`,
      padding:"3px 10px",borderRadius:20,letterSpacing:2,fontWeight:700,
      display:"inline-block",marginBottom:8}}>
      {children}
    </span>
  );
}

function CopyBox({label,content,id,copied,onCopy,color=C.gold,large=false}){
  if(!content)return null;
  const ok=copied===id;
  return(
    <div onClick={()=>onCopy(content,id)} style={{
      background:color+"08", border:`1px solid ${ok?C.success:color+"25"}`,
      borderRadius:10, padding:"12px 14px", cursor:"pointer",
      marginBottom:10, transition:"all 0.2s",
    }}>
      <div style={{fontSize:8,color,letterSpacing:3,marginBottom:6,fontWeight:700}}>{label}</div>
      <div style={{fontSize:large?16:13,fontWeight:large?700:400,lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap"}}>
        {content}
      </div>
      <div style={{fontSize:9,color:ok?C.success:C.textDim,marginTop:8}}>
        {ok?"✓ copiado!":"clique para copiar"}
      </div>
    </div>
  );
}

function Empty({icon,title,sub}){
  return(
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textDim}}>
      <div style={{fontSize:48,marginBottom:16}}>{icon}</div>
      <div style={{fontSize:16,marginBottom:8,color:C.textMid}}>{title}</div>
      <div style={{fontSize:12}}>{sub}</div>
    </div>
  );
}

function ScoreBar({score}){
  const cor=score>=80?C.success:score>=60?C.warning:C.accent;
  return(
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:C.textMid}}>Score de Segurança</span>
        <span style={{fontSize:14,fontWeight:700,color:cor}}>{score}/100</span>
      </div>
      <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${score}%`,background:cor,borderRadius:3,transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────
// MAIN APP
// ───────────────────────────────────────────────────────────────

export default function UltraConverter(){

  // Config
  const [provider, setProvider] = useState("openrouter");
  const [apiKeys, setApiKeys] = useState({openrouter:"",grok:"",gemini:""});
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [apiReady, setApiReady] = useState(false);
  const [limite, setLimite] = useState(30);

  // Produto
  const [form, setForm] = useState({
    nome:"",valor:"",categoria:"Beleza e cuidados pessoais",
    descricao:"",keyword:"",copyViral:"",creators:"",
  });
  const [blindador, setBlindador] = useState(true);
  const [quantidade, setQuantidade] = useState(10);

  // UI
  const [aba, setAba] = useState("config");
  const [loading, setLoading] = useState(false);
  const [loadingTipo, setLoadingTipo] = useState("");
  const [erro, setErro] = useState(null);
  const [resultados, setResultados] = useState({});
  const [copied, setCopied] = useState(null);

  // Escala
  const [scriptVencedor, setScriptVencedor] = useState("");
  const [qtdEscala, setQtdEscala] = useState(20);
  const [loadingEscala, setLoadingEscala] = useState(false);

  // Agent
  const [dadosKalodata, setDadosKalodata] = useState("");
  const [loadingAgent, setLoadingAgent] = useState(false);

  // Shield
  const [textoShield, setTextoShield] = useState("");
  const [loadingShield, setLoadingShield] = useState(false);

  // Load config salva
  useEffect(()=>{
    const saved = localStorage.getItem("ultra_v1");
    if(saved){
      try{
        const c = JSON.parse(saved);
        setProvider(c.provider||"openrouter");
        setApiKeys(c.apiKeys||{openrouter:"",grok:"",gemini:""});
        setModel(c.model||"google/gemini-2.5-flash");
        setLimite(c.limite||30);
        if(c.apiKeys?.[c.provider||"openrouter"]) setApiReady(true);
      }catch{}
    }
  },[]);

  const salvarConfig = () => {
    const key = apiKeys[provider];
    if(!key?.trim()){setErro("Insira a API Key!");return;}
    localStorage.setItem("ultra_v1",JSON.stringify({provider,apiKeys,model,limite}));
    setApiReady(true);
    setErro(null);
    setAba("produto");
  };

  const onCopy = (text,id) => {
    navigator.clipboard.writeText(text).catch(()=>{
      const el=document.createElement("textarea");
      el.value=text;document.body.appendChild(el);
      el.select();document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(id);
    setTimeout(()=>setCopied(null),1500);
  };

  const getKey = () => apiKeys[provider]||"";

  const buildUser = () => {
    const p = [];
    p.push(`Produto: ${form.nome}`);
    p.push(`Valor: R$${form.valor}`);
    p.push(`Categoria: ${form.categoria}`);
    p.push(`Descrição: ${form.descricao}`);
    if(form.keyword) p.push(`Keyword SEO (Creator Search Insights): ${form.keyword}`);
    if(form.creators) p.push(`Dados Creators/Kalodata: ${form.creators}`);
    if(form.copyViral) p.push(`📺 COPY VIRAL (modele a estrutura):\n"${form.copyViral}"`);
    return p.join("\n");
  };

  const gerar = async (tipo) => {
    if(!apiReady){setErro("Configure a API primeiro!");setAba("config");return;}
    if(!form.nome||!form.valor||!form.descricao){setErro("Preencha nome, valor e descrição!");return;}
    setErro(null);setLoading(true);setLoadingTipo(tipo);

    const prompts = {
      pov:     PROMPT_POV(limite,quantidade),
      coringa: PROMPT_CORINGA(limite,quantidade),
      hooks:   PROMPT_HOOKS(limite,quantidade),
      villain: PROMPT_VILLAIN(limite,quantidade),
      meta:    PROMPT_META(limite,quantidade),
      veo3:    PROMPT_VEO(limite,quantidade),
    };

    const system = prompts[tipo]+(blindador?"\n\n"+BLINDADOR:"");

    try{
      const data = await callJSON(provider,getKey(),model,system,buildUser());
      setResultados(prev=>({...prev,[tipo]:data}));
      setAba(tipo);
    }catch(e){setErro(e.message);}

    setLoading(false);setLoadingTipo("");
  };

  const gerarEscala = async () => {
    if(!apiReady){setErro("Configure a API!");return;}
    if(!scriptVencedor.trim()){setErro("Cole o script vencedor!");return;}
    setErro(null);setLoadingEscala(true);
    const system = PROMPT_ESCALA(limite,qtdEscala)+(blindador?"\n\n"+BLINDADOR:"");
    const user = `SCRIPT VENCEDOR:\n"${scriptVencedor}"\n\nProduto: ${form.nome}\nCategoria: ${form.categoria}`;
    try{
      const data = await callJSON(provider,getKey(),model,system,user);
      setResultados(prev=>({...prev,escala:data}));
      setAba("escala");
    }catch(e){setErro(e.message);}
    setLoadingEscala(false);
  };

  const gerarAgent = async () => {
    if(!apiReady){setErro("Configure a API!");return;}
    if(!dadosKalodata.trim()){setErro("Cole os dados do Kalodata!");return;}
    setErro(null);setLoadingAgent(true);
    try{
      const data = await callJSON(provider,getKey(),model,PROMPT_AGENT(),
        `DADOS KALODATA:\n\n${dadosKalodata}\n\nAnalise TODOS os produtos e retorne JSON.`,0.7);
      setResultados(prev=>({...prev,agent:data}));
      setAba("agent");
    }catch(e){setErro(e.message);}
    setLoadingAgent(false);
  };

  const gerarShield = async () => {
    if(!apiReady){setErro("Configure a API!");return;}
    if(!textoShield.trim()){setErro("Cole o texto!");return;}
    setErro(null);setLoadingShield(true);
    try{
      const data = await callJSON(provider,getKey(),model,PROMPT_SHIELD(),
        `Analise este texto para TikTok Shop Brasil:\n\n"${textoShield}"`);
      setResultados(prev=>({...prev,shield:data}));
    }catch(e){setErro(e.message);}
    setLoadingShield(false);
  };

  const usarProduto = (p) => {
    setForm(prev=>({
      ...prev,
      nome:p.nome||"",
      valor:p.valor?.toString()||"",
      categoria:p.categoria||"Beleza e cuidados pessoais",
      descricao:p.descricao_produto||"",
      creators:p.creators_data||"",
    }));
    setAba("produto");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const formatVeo = (s) =>
    `ugc influencer falando pt brasil\nEmotion/Tone: [${s.tom_emocional||"natural"}]\nela diz:\n${s.script}\nPrompt negativo: ${s.prompt_negativo||"sem texto, sem legendas, sem logos, sem distorções, sem mudanças de roupa, sem distorção facial, sem mudanças no fundo, sem movimentos bruscos"}`;

  const copiarTodosVeo = () => {
    const sc = resultados.veo3?.scripts_veo;
    if(!sc)return;
    onCopy(sc.map(s=>formatVeo(s)).join("\n\n---\n\n"),"todos_veo");
  };

  const prov = PROVIDERS[provider];

  const ABAS = [
    {id:"config", label:"⚙️ Config",  cor:C.info},
    {id:"agent",  label:"🔍 Agent",   cor:C.purple},
    {id:"produto",label:"📦 Produto", cor:C.gold},
    {id:"pov",    label:"📱 POV 10S", cor:C.gold},
    {id:"coringa",label:"🔥 Coringa", cor:C.accent},
    {id:"hooks",  label:"🎣 Hooks",   cor:C.gold},
    {id:"villain",label:"🎬 Villain", cor:C.gold},
    {id:"meta",   label:"💰 Meta",    cor:C.info},
    {id:"veo3",   label:"🚀 Veo 3",   cor:C.purple},
    {id:"escala", label:"📊 Escala",  cor:C.warning},
    {id:"shield", label:"🛡️ Shield",  cor:C.success},
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",color:C.text}}>

      {/* HEADER */}
      <div style={{background:`linear-gradient(180deg,#0a0500,${C.bg})`,borderBottom:`1px solid ${C.border}`,padding:"24px 20px"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{fontSize:9,letterSpacing:6,color:C.gold,marginBottom:6,fontWeight:700}}>
            ⚡ MODO ULTRA CONVERTER MILHÕES
          </div>
          <h1 style={{fontSize:30,fontWeight:900,margin:"0 0 6px",background:`linear-gradient(135deg,${C.gold},${C.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            TikTok Shop Ultra Generator
          </h1>
          <p style={{fontSize:11,color:C.textDim,margin:"0 0 14px"}}>
            OpenRouter · Grok · Gemini · POV 10S · Coringa · Hooks 12 Padrões · Villain · Meta · Veo3 · Agent · Shield
          </p>

          {/* MODO SELECTOR */}
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.card,border:`1px solid ${C.border}`,borderRadius:30,padding:"6px 8px"}}>
            <span style={{fontSize:10,color:C.textMid,marginLeft:8,marginRight:4}}>⚡ MODO:</span>
            {[30,40].map(n=>(
              <button key={n} onClick={()=>setLimite(n)} style={{
                background:limite===n?C.gold:"transparent",
                border:"none",borderRadius:20,padding:"6px 18px",
                color:limite===n?"#000":C.textMid,
                fontSize:13,fontWeight:limite===n?800:400,
                cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
              }}>
                {n} palavras
                {n===30&&<span style={{fontSize:9,marginLeft:4,opacity:0.8}}>Veo3</span>}
                {n===40&&<span style={{fontSize:9,marginLeft:4,opacity:0.8}}>Grok</span>}
              </button>
            ))}
          </div>

          {apiReady&&(
            <span style={{marginLeft:12,display:"inline-flex",alignItems:"center",gap:8,background:C.successDim,border:`1px solid ${C.success}30`,borderRadius:20,padding:"5px 14px",fontSize:11,color:C.success}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.success,display:"inline-block"}}/>
              {prov?.name} · {prov?.models.find(m=>m.id===model)?.name?.split("(")[0]?.trim()}
            </span>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:C.card,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",overflowX:"auto",padding:"0 20px"}}>
          {ABAS.map(a=>{
            const ativo=aba===a.id;
            return(
              <button key={a.id} onClick={()=>setAba(a.id)} style={{
                background:"none",border:"none",
                borderBottom:`2px solid ${ativo?a.cor:"transparent"}`,
                padding:"12px 14px",cursor:"pointer",fontFamily:"inherit",
                color:ativo?a.cor:C.textDim,fontSize:12,
                fontWeight:ativo?700:400,whiteSpace:"nowrap",transition:"all 0.2s",
              }}>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"30px 20px"}}>

        {/* CONFIG */}
        {aba==="config"&&(
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <Badge color={C.info}>⚙️ CONFIGURAÇÃO</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:24}}>Conectar API</div>

            {/* Provider */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:10,color:C.textMid,letterSpacing:2,marginBottom:12}}>1. ESCOLHA O PROVIDER</div>
              <div style={{display:"grid",gap:8}}>
                {Object.entries(PROVIDERS).map(([id,p])=>(
                  <button key={id} onClick={()=>{setProvider(id);setModel(p.models[0].id);}} style={{
                    background:provider===id?C.gold+"12":C.card2,
                    border:`1px solid ${provider===id?C.gold+"60":C.border}`,
                    borderRadius:10,padding:"14px 16px",cursor:"pointer",
                    fontFamily:"inherit",textAlign:"left",
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    transition:"all 0.15s",
                  }}>
                    <div>
                      <div style={{fontSize:14,color:provider===id?C.gold:C.text,fontWeight:provider===id?700:400}}>{p.name}</div>
                      <div style={{fontSize:11,color:C.textDim,marginTop:3}}>
                        {p.free?"✅ Tem opções grátis":"💰 Pago"} ·{" "}
                        <a href={p.keyUrl} target="_blank" rel="noreferrer" style={{color:C.info,textDecoration:"none"}}>
                          Pegar chave →
                        </a>
                      </div>
                    </div>
                    {provider===id&&<div style={{width:8,height:8,borderRadius:"50%",background:C.gold,flexShrink:0}}/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Modelo */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:10,color:C.textMid,letterSpacing:2,marginBottom:12}}>2. ESCOLHA O MODELO</div>
              <select style={inp()} value={model} onChange={e=>setModel(e.target.value)}>
                {prov?.models.map(m=>(
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:10,color:C.textMid,letterSpacing:2,marginBottom:12}}>
                3. API KEY — {prov?.name}
              </div>
              <input
                type="password"
                style={inp()}
                placeholder="Cole sua API Key aqui..."
                value={apiKeys[provider]||""}
                onChange={e=>setApiKeys(prev=>({...prev,[provider]:e.target.value}))}
              />
              <div style={{fontSize:11,color:C.textDim,marginTop:8}}>
                🔒 Salva só no seu navegador (localStorage)
              </div>
            </div>

            {/* Modo Ultra */}
            <div style={{background:C.card,border:`1px solid ${C.gold}30`,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:10,color:C.gold,letterSpacing:2,marginBottom:12}}>4. MODO ULTRA — LIMITE DE PALAVRAS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {n:30,desc:"Ideal para Veo 3 · Reels 8-10s · Loop perfeito"},
                  {n:40,desc:"Ideal para Grok · Reels 12-15s · Mais contexto"},
                ].map(({n,desc})=>(
                  <button key={n} onClick={()=>setLimite(n)} style={{
                    background:limite===n?C.gold+"20":C.card2,
                    border:`2px solid ${limite===n?C.gold:C.border}`,
                    borderRadius:10,padding:"16px 12px",
                    cursor:"pointer",fontFamily:"inherit",
                    color:limite===n?C.gold:C.textMid,textAlign:"center",
                    transition:"all 0.2s",
                  }}>
                    <div style={{fontSize:24,fontWeight:900}}>{n}</div>
                    <div style={{fontSize:10,marginTop:4}}>palavras</div>
                    <div style={{fontSize:9,color:C.textDim,marginTop:4,lineHeight:1.4}}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {erro&&(
              <div style={{padding:"12px 16px",background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:10,fontSize:13,color:C.accent,marginBottom:16}}>
                ⚠️ {erro}
              </div>
            )}

            <button onClick={salvarConfig} style={{...btn(false,C.gold),width:"100%",padding:"16px",fontSize:15}}>
              🚀 ATIVAR SISTEMA
            </button>
          </div>
        )}

        {/* AGENT FINDER */}
        {aba==="agent"&&(
          <div>
            <Badge color={C.purple}>🔍 AGENT FINDER 2.0</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Produto Vencedor Kalodata</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>Score 0-100 · ROI · Path R$10k · Auto-fill produto</div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{fontSize:11,color:C.textMid,marginBottom:10}}>
                📋 Como usar: Copie tudo do Kalodata (Ctrl+A → Ctrl+C) e cole aqui:
              </div>
              <textarea
                style={inp({minHeight:160,resize:"vertical",fontFamily:"monospace",fontSize:12})}
                placeholder="Cole os dados do Kalodata aqui (qualquer formato)..."
                value={dadosKalodata}
                onChange={e=>{setDadosKalodata(e.target.value);setErro(null);}}
              />
              {erro&&<div style={{marginTop:10,fontSize:12,color:C.accent}}>⚠️ {erro}</div>}
              <button onClick={gerarAgent} disabled={loadingAgent||!dadosKalodata.trim()}
                style={{...btn(loadingAgent||!dadosKalodata.trim(),C.purple),marginTop:14}}>
                {loadingAgent?"⟳ Analisando...":"🔍 Analisar Produtos"}
              </button>
            </div>

            {resultados.agent&&(
              <div>
                {/* Resumo */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:10,marginBottom:20}}>
                  {[
                    ["Total",resultados.agent.resumo?.total_analisados,C.text],
                    ["🏆 Ouro",resultados.agent.resumo?.ouro,C.gold],
                    ["🔥 Cavalo",resultados.agent.resumo?.cavalo,"#ff6b35"],
                    ["💥 Foguete",resultados.agent.resumo?.foguete,C.accent],
                    ["✅ Viável",resultados.agent.resumo?.viavel,C.success],
                    ["🔴 Ignorar",resultados.agent.resumo?.ignorar,C.textDim],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.textDim,marginBottom:4}}>{l}</div>
                      <div style={{fontSize:22,fontWeight:700,color:c}}>{v??0}</div>
                    </div>
                  ))}
                </div>

                {/* Top 3 */}
                {resultados.agent.top_3?.length>0&&(
                  <div style={{background:C.card,border:`2px solid ${C.gold}40`,borderRadius:14,padding:20,marginBottom:20}}>
                    <div style={{fontSize:11,color:C.gold,letterSpacing:2,marginBottom:12}}>🏆 TOP 3 PRIORIDADES</div>
                    {resultados.agent.top_3.map((t,i)=>(
                      <div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <span style={{fontSize:18,fontWeight:700,color:C.gold}}>#{t.posicao}</span>
                          <span style={{fontSize:14,marginLeft:10}}>{t.nome}</span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{fontSize:11,color:C.textDim}}>{t.recomendacao}</span>
                          <span style={{fontSize:14,fontWeight:700,color:C.success,background:C.successDim,padding:"4px 10px",borderRadius:6}}>{t.score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Produtos */}
                {resultados.agent.produtos?.map((p,i)=>{
                  const cor=p.score>=90?C.gold:p.score>=75?"#ff6b35":p.score>=60?C.accent:C.textDim;
                  return(
                    <div key={i} style={{background:C.card,border:`2px solid ${cor}35`,borderRadius:14,padding:20,marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div>
                          <div style={{fontSize:16,fontWeight:700}}>{p.classificacao} {p.nome}</div>
                          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{p.categoria} · R${p.valor}</div>
                        </div>
                        <div style={{fontSize:30,fontWeight:900,color:cor}}>{p.score}</div>
                      </div>
                      <div style={{fontSize:12,color:C.success,fontStyle:"italic",marginBottom:12}}>💡 {p.por_que}</div>

                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:12}}>
                        {[
                          ["Conversão",`${p.conversao}%`,C.success],
                          ["Criadores",p.criadores,C.text],
                          ["Comissão/venda",`R$${p.comissao_por_venda?.toFixed(2)}`,C.gold],
                          ["GMV",p.gmv,C.info],
                        ].map(([l,v,c])=>(
                          <div key={l} style={{background:C.card2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:9,color:C.textDim}}>{l}</div>
                            <div style={{fontSize:13,fontWeight:600,color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{background:C.card2,border:`1px solid ${C.gold}25`,borderRadius:10,padding:12,marginBottom:12}}>
                        <div style={{fontSize:9,color:C.gold,letterSpacing:2,marginBottom:4}}>💰 PATH R$10K/MÊS</div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.path_10k}</div>
                      </div>

                      {p.angulos_matadores?.length>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:8}}>💡 ÂNGULOS MATADORES</div>
                          {p.angulos_matadores.map((a,ai)=>(
                            <div key={ai} style={{fontSize:12,color:C.textMid,marginBottom:4}}>· {a}</div>
                          ))}
                        </div>
                      )}

                      {p.hooks_prontos?.length>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:9,color:C.gold,letterSpacing:2,marginBottom:8}}>🎣 HOOKS PRONTOS</div>
                          {p.hooks_prontos.map((h,hi)=>(
                            <div key={hi} onClick={()=>onCopy(h,`ah${i}${hi}`)} style={{
                              background:C.gold+"08",border:`1px solid ${copied===`ah${i}${hi}`?C.success:C.gold+"20"}`,
                              borderRadius:8,padding:"8px 12px",marginBottom:6,cursor:"pointer",fontSize:13,
                            }}>
                              "{h}"
                              <div style={{fontSize:9,color:copied===`ah${i}${hi}`?C.success:C.textDim,marginTop:4}}>
                                {copied===`ah${i}${hi}`?"✓ copiado":"copiar"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {p.red_flags?.length>0&&(
                        <div style={{background:C.accentDim,border:`1px solid ${C.accent}30`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                          <div style={{fontSize:9,color:C.accent,letterSpacing:2,marginBottom:6}}>⚠️ RED FLAGS</div>
                          {p.red_flags.map((rf,ri)=>(
                            <div key={ri} style={{fontSize:12,color:C.accent,marginBottom:2}}>· {rf}</div>
                          ))}
                        </div>
                      )}

                      <button onClick={()=>usarProduto(p)} style={{...btn(false,C.success),width:"100%",fontWeight:700}}>
                        🚀 USAR ESTE PRODUTO → Gerar Conteúdo
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PRODUTO */}
        {aba==="produto"&&(
          <div style={{maxWidth:700,margin:"0 auto"}}>
            <Badge>📦 PRODUTO</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:24}}>Informações do Produto</div>

            {!apiReady&&(
              <div style={{padding:"14px 18px",background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:10,fontSize:13,color:C.accent,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>⚠️ Configure a API primeiro!</span>
                <button onClick={()=>setAba("config")} style={btn(false,C.accent)}>Configurar →</button>
              </div>
            )}

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
              <div style={{display:"grid",gap:14}}>

                <input style={inp()} placeholder="Nome do produto *"
                  value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <input style={inp()} placeholder="Valor R$ *"
                    value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
                  <select style={inp()} value={form.categoria}
                    onChange={e=>setForm(p=>({...p,categoria:e.target.value}))}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <textarea style={inp({minHeight:90,resize:"vertical"})}
                  placeholder="Descrição / Benefícios / Diferenciais *"
                  value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))}/>

                <input
                  style={inp({background:"#050a10",border:`1px solid ${form.keyword?C.info+"60":C.border}`})}
                  placeholder="🔍 Keyword SEO (Creator Search Insights) — ex: best serum for oily skin"
                  value={form.keyword}
                  onChange={e=>setForm(p=>({...p,keyword:e.target.value}))}
                />
                {form.keyword&&(
                  <div style={{fontSize:11,color:C.info,background:C.infoDim,padding:"8px 12px",borderRadius:8}}>
                    ✅ Keyword será integrada no hook, narração e legenda automaticamente
                  </div>
                )}

                <textarea
                  style={inp({minHeight:90,resize:"vertical",background:"#150a15",border:`2px solid ${form.copyViral?C.accent:C.border}`})}
                  placeholder="📺 COPY VIRAL (opcional) — cole um script que já vendeu para modelar a estrutura"
                  value={form.copyViral}
                  onChange={e=>setForm(p=>({...p,copyViral:e.target.value}))}
                />
                {form.copyViral&&(
                  <div style={{fontSize:11,color:C.accent,background:C.accentDim,padding:"8px 12px",borderRadius:8}}>
                    ✨ Copy viral detectada! Estrutura será modelada em todas as gerações.
                  </div>
                )}

                <textarea style={inp({minHeight:60,resize:"vertical"})}
                  placeholder="Dados Creators / Kalodata (opcional)"
                  value={form.creators} onChange={e=>setForm(p=>({...p,creators:e.target.value}))}/>

                {/* Quantidade */}
                <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:11,color:C.gold,letterSpacing:2}}>📊 QUANTIDADE</div>
                    <div style={{fontSize:26,fontWeight:900,color:C.gold}}>{quantidade}</div>
                  </div>
                  <input type="range" min="5" max="50" step="5" value={quantidade}
                    onChange={e=>setQuantidade(parseInt(e.target.value))}
                    style={{width:"100%",accentColor:C.gold}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textDim,marginTop:4}}>
                    <span>5</span><span>25</span><span>50</span>
                  </div>
                </div>

                {/* Modo Ultra inline */}
                <div style={{background:C.goldDim,border:`1px solid ${C.gold}30`,borderRadius:10,padding:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:11,color:C.gold,fontWeight:700}}>⚡ MODO: {limite} PALAVRAS</div>
                    <div style={{fontSize:10,color:C.textDim,marginTop:2}}>
                      {limite===30?"Ideal para Veo 3 · Reels 8-10s":"Ideal para Grok · Reels 12-15s"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {[30,40].map(n=>(
                      <button key={n} onClick={()=>setLimite(n)} style={{
                        background:limite===n?C.gold:"transparent",
                        border:`1px solid ${limite===n?C.gold:C.border}`,
                        borderRadius:8,padding:"6px 14px",
                        color:limite===n?"#000":C.textMid,
                        fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      }}>{n}</button>
                    ))}
                  </div>
                </div>

                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" checked={blindador} onChange={e=>setBlindador(e.target.checked)}
                    style={{width:16,height:16,accentColor:C.gold}}/>
                  <span style={{fontSize:13,color:C.textMid}}>🛡️ Blindador Ultra v3 (compliance TikTok BR)</span>
                </label>

                {erro&&(
                  <div style={{padding:"12px 16px",background:C.accentDim,border:`1px solid ${C.accent}40`,borderRadius:10,fontSize:13,color:C.accent}}>
                    ⚠️ {erro}
                  </div>
                )}

                <div style={{height:1,background:C.border}}/>

                {/* Botões */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
                  {[
                    {tipo:"pov",    label:"📱 POV 10S",    cor:C.gold},
                    {tipo:"coringa",label:"🔥 Coringa",     cor:C.accent},
                    {tipo:"hooks",  label:"🎣 Hooks",       cor:C.gold},
                    {tipo:"villain",label:"🎬 Villain Hero",cor:C.gold},
                    {tipo:"meta",   label:"💰 Meta Ads",    cor:C.info},
                    {tipo:"veo3",   label:"🚀 Veo 3",       cor:C.purple},
                  ].map(({tipo,label,cor})=>(
                    <button key={tipo} onClick={()=>gerar(tipo)}
                      disabled={loading||!apiReady}
                      style={btn(loading||!apiReady,cor)}>
                      {loading&&loadingTipo===tipo?"⟳ Gerando...":`${label} (${quantidade})`}
                    </button>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* POV 10S */}
        {aba==="pov"&&(
          <div>
            <Badge>📱 POV 10S</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Formato POV Segurando Produto</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              Validado · 8-10s · SEO integrado · Loop perfeito · {limite} palavras
            </div>
            {resultados.pov?.videos_pov?.length>0?resultados.pov.videos_pov.map((v,i)=>{
              const scoreCor=C.gold;
              return(
                <div key={i} style={{background:C.card,border:`2px solid ${scoreCor}25`,borderRadius:14,padding:20,marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <Badge>VÍDEO {v.numero}</Badge>
                      <div style={{fontSize:15,fontWeight:700}}>{v.padrao_hook}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <span style={{fontSize:10,color:C.gold,background:C.goldDim,padding:"3px 10px",borderRadius:20}}>{v.duracao}</span>
                      <span style={{fontSize:10,color:C.success,background:C.successDim,padding:"3px 10px",borderRadius:20}}>{v.total_palavras} pal</span>
                      {v.gatilho_usado&&<span style={{fontSize:10,color:C.purple,background:C.purpleDim,padding:"3px 10px",borderRadius:20}}>{v.gatilho_usado}</span>}
                    </div>
                  </div>

                  {v.keyword_seo&&(
                    <div style={{fontSize:11,color:C.info,background:C.infoDim,padding:"8px 12px",borderRadius:8,marginBottom:12}}>
                      🔍 Keyword SEO: <strong>{v.keyword_seo}</strong>
                    </div>
                  )}

                  <CopyBox label="📱 HOOK TEXTO NA TELA (0-2s)" content={v.hook_texto_tela} id={`pov_ht${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                  <CopyBox label="🎙️ HOOK NARRADO (0-2s) — fale isso enquanto o texto aparece" content={v.hook_narrado} id={`pov_hn${i}`} copied={copied} onCopy={onCopy} color={C.gold}/>

                  <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
                    <div style={{fontSize:9,color:C.warning,letterSpacing:2,marginBottom:8}}>📷 BODY VISUAL (2-7s) — o que fazer com o produto na mão</div>
                    <div style={{fontSize:13,color:C.text}}>{v.body_visual}</div>
                  </div>

                  <CopyBox label="🎙️ BODY NARRADO (2-7s)" content={v.body_narrado} id={`pov_bn${i}`} copied={copied} onCopy={onCopy} color={C.warning}/>
                  <CopyBox label="🛒 CTA (7-10s)" content={v.cta} id={`pov_cta${i}`} copied={copied} onCopy={onCopy} color={C.success}/>
                  <CopyBox label="📋 LEGENDA SEO" content={v.legenda} id={`pov_leg${i}`} copied={copied} onCopy={onCopy} color={C.info}/>
                  <CopyBox label="# HASHTAGS (5)" content={v.hashtags?.join(" ")} id={`pov_hash${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>

                  {v.loop&&(
                    <div style={{background:C.purpleDim,border:`1px solid ${C.purple}30`,borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                      <div style={{fontSize:9,color:C.purple,letterSpacing:2,marginBottom:4}}>🔄 LOOP PERFEITO</div>
                      <div style={{fontSize:12,color:C.textMid}}>{v.loop}</div>
                    </div>
                  )}

                  {v.por_que_converte&&(
                    <div style={{fontSize:11,color:C.textDim}}>
                      🧠 <strong style={{color:C.textMid}}>Por que converte:</strong> {v.por_que_converte}
                    </div>
                  )}
                </div>
              );
            }):<Empty icon="📱" title="Nenhum vídeo POV gerado" sub='Vá em 📦 Produto e clique em "POV 10S"'/>}
          </div>
        )}

        {/* CORINGA */}
        {aba==="coringa"&&(
          <div>
            <Badge color={C.accent}>🔥 FORMATO CORINGA</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Baseado em 214k+ Views</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              Negativas + Original + Preço + Urgência · {limite} palavras
            </div>
            {resultados.coringa?.formato_coringa?.length>0?resultados.coringa.formato_coringa.map((c,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.accent}30`,borderRadius:14,padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <Badge color={C.accent}>VARIAÇÃO {c.numero}</Badge>
                  <div style={{display:"flex",gap:6}}>
                    <span style={{fontSize:10,color:C.success,background:C.successDim,padding:"3px 10px",borderRadius:20}}>{c.total_palavras} palavras</span>
                    <span style={{fontSize:10,color:C.textDim,background:C.card2,padding:"3px 10px",borderRadius:20}}>{c.inspirado_em}</span>
                  </div>
                </div>

                <CopyBox label="🔥 TEXTO COMPLETO" content={c.texto_completo} id={`cor${i}`} copied={copied} onCopy={onCopy} color={C.accent} large/>

                {c.negativas_usadas?.length>0&&(
                  <div style={{background:C.card2,borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                    <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:6}}>NEGATIVAS USADAS</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {c.negativas_usadas.map((n,ni)=>(
                        <span key={ni} style={{fontSize:11,color:C.accent,background:C.accentDim,padding:"3px 10px",borderRadius:20}}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  {c.preco_ancora&&(
                    <div style={{background:C.card2,borderRadius:8,padding:"8px 12px"}}>
                      <div style={{fontSize:9,color:C.gold,marginBottom:2}}>ÂNCORA DE PREÇO</div>
                      <div style={{fontSize:12}}>{c.preco_ancora}</div>
                    </div>
                  )}
                  {c.urgencia&&(
                    <div style={{background:C.card2,borderRadius:8,padding:"8px 12px"}}>
                      <div style={{fontSize:9,color:C.warning,marginBottom:2}}>URGÊNCIA</div>
                      <div style={{fontSize:12}}>{c.urgencia}</div>
                    </div>
                  )}
                </div>

                {c.quando_usar&&(
                  <div style={{fontSize:11,color:C.textDim}}>
                    💡 <strong style={{color:C.textMid}}>Quando usar:</strong> {c.quando_usar}
                  </div>
                )}
              </div>
            )):<Empty icon="🔥" title="Nenhuma variação Coringa gerada" sub='Vá em 📦 Produto e clique em "Coringa"'/>}
          </div>
        )}

        {/* HOOKS */}
        {aba==="hooks"&&(
          <div>
            <Badge>🎣 HOOKS CIENTÍFICOS</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>12 Padrões Milionários</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              Score · CTR · Retenção · 3 Variações · {limite} palavras
            </div>
            {resultados.hooks?.hooks?.length>0?resultados.hooks.hooks.map((h,i)=>{
              const scoreCor=h.score_probabilidade>=90?C.gold:h.score_probabilidade>=80?C.success:h.score_probabilidade>=70?C.warning:C.textDim;
              const classifCor=h.classificacao?.includes("Milionário")?C.gold:h.classificacao?.includes("Campeão")?C.success:C.warning;
              return(
                <div key={i} style={{background:C.card,border:`2px solid ${scoreCor}30`,borderRadius:14,padding:20,marginBottom:20}}>

                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div>
                      <Badge color={scoreCor}>HOOK {h.numero}</Badge>
                      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{h.padrao}</div>
                      <div style={{fontSize:11,color:C.textDim}}>{h.formula_usada}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:34,fontWeight:900,color:scoreCor,lineHeight:1}}>{h.score_probabilidade}</div>
                      <div style={{fontSize:9,color:C.textDim}}>/100</div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))",gap:8,marginBottom:14}}>
                    {[
                      ["CTR",h.ctr_esperado,C.success],
                      ["Retenção",h.retencao_esperada,C.info],
                      ["Conv. Média",h.conversao_media,C.gold],
                      ["Nicho",h.nicho_ideal,C.purple],
                    ].map(([l,v,c])=>v&&(
                      <div key={l} style={{background:C.card2,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.textDim,marginBottom:2}}>{l}</div>
                        <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Classificação */}
                  {h.classificacao&&(
                    <div style={{fontSize:11,color:classifCor,background:classifCor+"15",border:`1px solid ${classifCor}30`,padding:"5px 14px",borderRadius:20,display:"inline-block",marginBottom:14}}>
                      {h.classificacao}
                    </div>
                  )}

                  {/* Keyword */}
                  {h.keyword_integrada&&(
                    <div style={{fontSize:11,color:C.info,background:C.infoDim,padding:"8px 12px",borderRadius:8,marginBottom:12}}>
                      🔍 Keyword: <strong>{h.keyword_integrada}</strong>
                    </div>
                  )}

                  {/* Hook principal */}
                  <CopyBox label="📱 HOOK TEXTO NA TELA (máx 12 palavras)" content={h.hook_texto_tela} id={`hk_tela${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                  <CopyBox label="🎙️ HOOK NARRADO (com keyword)" content={h.hook_narrado} id={`hk_nar${i}`} copied={copied} onCopy={onCopy} color={C.warning}/>

                  {/* Ciência */}
                  <div style={{background:C.card2,borderRadius:10,padding:14,marginBottom:14}}>
                    <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:10}}>🧠 CIÊNCIA POR TRÁS DO HOOK</div>
                    {h.gatilho_psicologico&&<div style={{fontSize:12,color:C.textMid,marginBottom:6}}><strong style={{color:C.text}}>Gatilho:</strong> {h.gatilho_psicologico}</div>}
                    {h.por_que_para_scroll&&<div style={{fontSize:12,color:C.textMid,marginBottom:6}}><strong style={{color:C.text}}>Por que para o scroll:</strong> {h.por_que_para_scroll}</div>}
                    {h.quando_usar&&<div style={{fontSize:12,color:C.textMid}}><strong style={{color:C.text}}>Quando usar:</strong> {h.quando_usar}</div>}
                  </div>

                  {/* Variações */}
                  {(h.variacao_1||h.variacao_2||h.variacao_3)&&(
                    <div style={{background:C.purpleDim,border:`1px solid ${C.purple}20`,borderRadius:10,padding:14}}>
                      <div style={{fontSize:9,color:C.purple,letterSpacing:2,marginBottom:10}}>🔄 3 VARIAÇÕES DO MESMO PADRÃO</div>
                      {h.variacao_1&&<CopyBox label="VARIAÇÃO 1" content={h.variacao_1} id={`hkv1_${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>}
                      {h.variacao_2&&<CopyBox label="VARIAÇÃO 2" content={h.variacao_2} id={`hkv2_${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>}
                      {h.variacao_3&&<CopyBox label="VARIAÇÃO 3" content={h.variacao_3} id={`hkv3_${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>}
                    </div>
                  )}
                </div>
              );
            }):<Empty icon="🎣" title="Nenhum hook gerado" sub='Vá em 📦 Produto e clique em "Hooks"'/>}
          </div>
        )}

        {/* VILLAIN HERO */}
        {aba==="villain"&&(
          <div>
            <Badge>🎬 VILLAIN VS HERO</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Roteiros Estruturados</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              Para produtos que precisam de explicação · {limite} palavras
            </div>
            {resultados.villain?.roteiros_villain_hero?.length>0?resultados.villain.roteiros_villain_hero.map((r,i)=>{
              const palavras=(r.roteiro_narrado||"").split(" ").filter(Boolean).length;
              return(
                <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <Badge>ROTEIRO {r.numero}</Badge>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{fontSize:10,color:C.gold,background:C.goldDim,padding:"3px 10px",borderRadius:20}}>{r.duracao}</span>
                      <span style={{fontSize:10,color:palavras<=limite?C.success:C.accent,background:palavras<=limite?C.successDim:C.accentDim,padding:"3px 10px",borderRadius:20}}>{palavras} palavras</span>
                    </div>
                  </div>

                  {r.keyword_seo&&(
                    <div style={{fontSize:11,color:C.info,background:C.infoDim,padding:"8px 12px",borderRadius:8,marginBottom:12}}>
                      🔍 Keyword: <strong>{r.keyword_seo}</strong>
                    </div>
                  )}

                  <CopyBox label="📱 HOOK TEXTO NA TELA" content={r.pov_hook_tela} id={`vh_ht${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                  <CopyBox label={`🎙️ ROTEIRO NARRADO · ${palavras} PALAVRAS`} content={r.roteiro_narrado} id={`vh_rn${i}`} copied={copied} onCopy={onCopy} color={C.success}/>

                  <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
                    <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:10}}>ESTRUTURA</div>
                    {[["👿 Villain",r.villain,C.warning],["🦸 Hero",r.hero,C.success],["✓ Proof",r.proof,C.info]].map(([l,v,c])=>v&&(
                      <div key={l} style={{marginBottom:8,fontSize:12}}>
                        <strong style={{color:c}}>{l}:</strong> <span style={{color:C.textMid}}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <CopyBox label="📋 LEGENDA SEO" content={r.legenda_seo} id={`vh_leg${i}`} copied={copied} onCopy={onCopy} color={C.warning}/>
                  <CopyBox label="# HASHTAGS (5)" content={r.hashtags?.join(" ")} id={`vh_hash${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>
                  {r.quando_usar&&<div style={{fontSize:11,color:C.textDim,marginTop:6}}>💡 <strong style={{color:C.textMid}}>Quando usar:</strong> {r.quando_usar}</div>}
                </div>
              );
            }):<Empty icon="🎬" title="Nenhum roteiro gerado" sub='Vá em 📦 Produto e clique em "Villain Hero"'/>}
          </div>
        )}
		        {/* META ADS */}
        {aba==="meta"&&(
          <div>
            <Badge color={C.info}>💰 META ADS ENGINE</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>5 Hooks que Convertem</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>$1M+ testado · {limite} palavras</div>

            {resultados.meta?.meta_hooks?.length>0?(
              <div>
                {resultados.meta.meta_hooks.map((h,i)=>(
                  <div key={i} style={{background:C.card,border:`2px solid ${C.info}25`,borderRadius:14,padding:20,marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div>
                        <Badge color={C.info}>HOOK {h.numero}</Badge>
                        <div style={{fontSize:16,fontWeight:700}}>{h.nome}</div>
                      </div>
                      <span style={{fontSize:11,color:h.nivel_conversao==="MÁXIMO"?C.accent:C.warning,background:(h.nivel_conversao==="MÁXIMO"?C.accentDim:C.warningDim),padding:"5px 14px",borderRadius:20,fontWeight:700}}>
                        🔥 {h.nivel_conversao}
                      </span>
                    </div>
                    <CopyBox label="🎯 HOOK PRINCIPAL" content={h.hook_principal} id={`meta_h${i}`} copied={copied} onCopy={onCopy} color={C.info} large/>
                    <CopyBox label="🎬 SCRIPT COMPLETO" content={h.script_completo} id={`meta_s${i}`} copied={copied} onCopy={onCopy} color={C.success}/>
                    {h.variacoes_dor?.length>0&&(
                      <div style={{background:C.card2,borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                        <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:8}}>🔄 VARIAÇÕES DE DOR</div>
                        {h.variacoes_dor.map((v,vi)=>(
                          <CopyBox key={vi} label={`VAR ${vi+1}`} content={v} id={`meta_v${i}${vi}`} copied={copied} onCopy={onCopy} color={C.purple}/>
                        ))}
                      </div>
                    )}
                    {h.instrucao_avatar&&(
                      <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
                        🎭 <strong style={{color:C.textMid}}>Avatar:</strong> {h.instrucao_avatar}
                      </div>
                    )}
                  </div>
                ))}
                {resultados.meta.estrategia_teste&&(
                  <div style={{background:C.card,border:`1px solid ${C.gold}30`,borderRadius:14,padding:20}}>
                    <Badge>⚡ ESTRATÉGIA DE TESTE</Badge>
                    {[["Ordem de teste",resultados.meta.estrategia_teste.ordem_teste],["Como escalar",resultados.meta.estrategia_teste.como_escalar]].map(([k,v])=>v&&(
                      <div key={k} style={{fontSize:12,color:C.textMid,marginBottom:8}}>
                        <strong style={{color:C.text}}>{k}:</strong> {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ):<Empty icon="💰" title="Nenhum hook Meta gerado" sub='Vá em 📦 Produto e clique em "Meta Ads"'/>}
          </div>
        )}

        {/* VEO 3 */}
        {aba==="veo3"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <Badge color={C.purple}>🚀 VEO 3</Badge>
                <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Scripts para IA de Vídeo</div>
                <div style={{fontSize:13,color:C.textDim}}>Veo 3 · Sora · Kling · {limite} palavras</div>
              </div>
              {resultados.veo3?.scripts_veo?.length>0&&(
                <button onClick={copiarTodosVeo} style={btn(false,C.success)}>
                  {copied==="todos_veo"?"✓ Copiados!":"📋 Copiar Todos"}
                </button>
              )}
            </div>

            {resultados.veo3?.scripts_veo?.length>0?resultados.veo3.scripts_veo.map((s,i)=>{
              const prompt=formatVeo(s);
              return(
                <div key={i} style={{background:C.card,border:`1px solid ${C.purple}30`,borderRadius:14,padding:20,marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <Badge color={C.purple}>PROMPT {s.numero}</Badge>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{fontSize:10,color:C.warning}}>{s.palavras} palavras</span>
                      <span style={{fontSize:10,color:C.purple,background:C.purpleDim,padding:"3px 10px",borderRadius:20}}>{s.tom_emocional}</span>
                    </div>
                  </div>
                  <CopyBox label="🎬 PROMPT VEO 3 COMPLETO" content={prompt} id={`veo${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>
                  {s.descricao_visual&&(
                    <div style={{background:C.card2,borderRadius:8,padding:"10px 14px"}}>
                      <div style={{fontSize:9,color:C.textDim,letterSpacing:2,marginBottom:4}}>📷 DESCRIÇÃO VISUAL</div>
                      <div style={{fontSize:12,color:C.textMid}}>{s.descricao_visual}</div>
                    </div>
                  )}
                </div>
              );
            }):<Empty icon="🚀" title="Nenhum script Veo 3 gerado" sub='Vá em 📦 Produto e clique em "Veo 3"'/>}
          </div>
        )}

        {/* ESCALA CBO */}
        {aba==="escala"&&(
          <div>
            <Badge color={C.warning}>📊 ESCALA CIENTÍFICA CBO</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Multiplica Scripts Vencedores</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              testa 100 → 10 vendem → 3 explodem · {limite} palavras
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,marginBottom:24}}>
              <div style={{fontSize:11,color:C.textMid,marginBottom:10}}>
                Cole o script que VENDEU ou VIRALIZOU:
              </div>
              <textarea
                style={inp({minHeight:120,resize:"vertical"})}
                placeholder='Ex: "minha amiga me indicou esse sérum, testei por 2 semanas, percebi diferença na textura, menos de 30 reais, carrinho laranja"'
                value={scriptVencedor}
                onChange={e=>{setScriptVencedor(e.target.value);setErro(null);}}
              />

              <div style={{fontSize:11,color:C.textMid,margin:"16px 0 10px"}}>Quantas variações?</div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {[10,20,50].map(n=>(
                  <button key={n} onClick={()=>setQtdEscala(n)} style={{
                    background:qtdEscala===n?C.goldDim:C.card2,
                    border:`1px solid ${qtdEscala===n?C.gold+"60":C.border}`,
                    borderRadius:10,padding:"10px 20px",
                    color:qtdEscala===n?C.gold:C.textDim,
                    fontSize:14,fontWeight:qtdEscala===n?700:400,
                    cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
                  }}>
                    {n}{n===20?" ✨":""}
                  </button>
                ))}
              </div>

              {erro&&<div style={{marginBottom:14,fontSize:13,color:C.accent}}>⚠️ {erro}</div>}

              <button onClick={gerarEscala} disabled={loadingEscala||!scriptVencedor.trim()}
                style={btn(loadingEscala||!scriptVencedor.trim(),C.warning)}>
                {loadingEscala?"⟳ Gerando...`":`🚀 Gerar ${qtdEscala} Variações`}
              </button>
            </div>

            {resultados.escala&&(
              <div>
                {resultados.escala.analise&&(
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20}}>
                    <Badge color={C.warning}>📊 ANÁLISE DO SCRIPT VENCEDOR</Badge>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:4}}>
                      {[
                        ["Padrão",resultados.escala.analise.padrao_detectado],
                        ["Tom",resultados.escala.analise.tom_emocional],
                        ["Estrutura",resultados.escala.analise.estrutura],
                        ["Palavras",resultados.escala.analise.total_palavras],
                        ["Gatilho",resultados.escala.analise.gatilho_principal],
                      ].map(([k,v])=>v&&(
                        <div key={k} style={{background:C.card2,borderRadius:8,padding:"8px 12px"}}>
                          <div style={{fontSize:9,color:C.textDim,marginBottom:2}}>{k}</div>
                          <div style={{fontSize:12,fontWeight:600,color:C.gold}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{fontSize:11,color:C.textDim,letterSpacing:2,marginBottom:16}}>
                  {resultados.escala.variacoes?.length} VARIAÇÕES GERADAS
                </div>

                {resultados.escala.variacoes?.map((v,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <Badge color={C.warning}>VAR {v.numero}</Badge>
                      <span style={{fontSize:10,color:C.warning,background:C.warningDim,padding:"3px 10px",borderRadius:20}}>
                        {v.tipo_variacao}
                      </span>
                    </div>
                    <CopyBox label="📱 HOOK" content={v.hook_texto} id={`esc_h${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                    <CopyBox label="🎙️ ROTEIRO" content={v.roteiro} id={`esc_r${i}`} copied={copied} onCopy={onCopy} color={C.success}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <CopyBox label="📋 LEGENDA" content={v.legenda} id={`esc_l${i}`} copied={copied} onCopy={onCopy} color={C.warning}/>
                      <CopyBox label="# HASHTAGS" content={v.hashtags?.join(" ")} id={`esc_hash${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>
                    </div>
                    <div style={{fontSize:10,color:C.textDim,marginTop:4}}>
                      💡 <strong style={{color:C.textMid}}>Mudança:</strong> {v.o_que_mudou}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SHIELD */}
        {aba==="shield"&&(
          <div>
            <Badge color={C.success}>🛡️ SHIELD v3</Badge>
            <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Scanner de Compliance</div>
            <div style={{fontSize:13,color:C.textDim,marginBottom:24}}>
              7 categorias · Score 0-100 · Correção automática
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,marginBottom:20}}>
              <textarea
                style={inp({minHeight:150,resize:"vertical"})}
                placeholder="Cole qualquer texto para analisar (hook, roteiro, legenda, script)..."
                value={textoShield}
                onChange={e=>{setTextoShield(e.target.value);setErro(null);if(resultados.shield)setResultados(p=>({...p,shield:null}));}}
              />
              {textoShield&&(
                <div style={{fontSize:10,color:C.textDim,marginTop:4}}>
                  {textoShield.split(" ").filter(Boolean).length} palavras
                </div>
              )}
              {erro&&<div style={{marginTop:10,fontSize:12,color:C.accent}}>⚠️ {erro}</div>}
              <button onClick={gerarShield} disabled={loadingShield||!textoShield.trim()}
                style={{...btn(loadingShield||!textoShield.trim(),C.success),marginTop:14}}>
                {loadingShield?"⟳ Analisando 7 categorias...":"🛡️ Analisar Compliance"}
              </button>
            </div>

            {resultados.shield&&(()=>{
              const sh=resultados.shield;
              const nivelCor=sh.nivel_risco==="VERDE"?C.success:sh.nivel_risco==="AMARELO"?C.warning:C.accent;
              return(
                <div>
                  <div style={{background:C.card,border:`2px solid ${nivelCor}40`,borderRadius:14,padding:24,marginBottom:16}}>

                    <ScoreBar score={sh.score_seguranca}/>

                    <div style={{fontSize:16,fontWeight:700,color:nivelCor,marginBottom:16}}>
                      {sh.nivel_risco==="VERDE"?"🟢 APROVADO — Seguro para postar":sh.nivel_risco==="AMARELO"?"🟡 ATENÇÃO — Ajuste necessário":"🔴 RISCO DE BAN — Corrija antes de postar"}
                    </div>

                    <div style={{fontSize:13,color:C.textMid,lineHeight:1.7,background:C.card2,padding:14,borderRadius:10,marginBottom:20}}>
                      {sh.resumo}
                    </div>

                    {sh.violacoes?.length>0&&(
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:11,color:C.accent,letterSpacing:2,marginBottom:12}}>
                          ❌ {sh.violacoes.length} VIOLAÇÃO(ÕES) DETECTADA(S)
                        </div>
                        {sh.violacoes.map((v,i)=>(
                          <div key={i} style={{background:C.accentDim,border:`1px solid ${C.accent}30`,borderRadius:10,padding:14,marginBottom:10}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <div style={{fontSize:12,fontWeight:700,color:C.accent}}>{v.tipo}</div>
                              <span style={{fontSize:10,color:v.gravidade==="ALTA"?C.accent:C.warning,background:(v.gravidade==="ALTA"?C.accentDim:C.warningDim),padding:"2px 10px",borderRadius:20}}>
                                {v.gravidade}
                              </span>
                            </div>
                            {v.trecho&&(
                              <div style={{fontSize:12,color:C.accent,fontStyle:"italic",marginBottom:8,background:C.accentDim,padding:"6px 10px",borderRadius:6}}>
                                "{v.trecho}"
                              </div>
                            )}
                            <div style={{fontSize:12,color:C.success}}>
                              ✅ <strong>Sugestão:</strong> {v.sugestao}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sh.pontos_positivos?.length>0&&(
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:11,color:C.success,letterSpacing:2,marginBottom:10}}>✅ PONTOS POSITIVOS</div>
                        <div style={{background:C.card,border:`1px solid ${C.success}20`,borderRadius:10,padding:14}}>
                          {sh.pontos_positivos.map((p,i)=>(
                            <div key={i} style={{fontSize:12,color:C.textMid,marginBottom:6,display:"flex",gap:8}}>
                              <span style={{color:C.success}}>✓</span>{p}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sh.texto_corrigido&&(
                      <div style={{background:C.card,border:`1px solid ${C.success}30`,borderRadius:12,overflow:"hidden"}}>
                        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:C.success,letterSpacing:2}}>✨ TEXTO CORRIGIDO</div>
                            <div style={{fontSize:10,color:C.textDim,marginTop:2}}>Versão segura pronta para postar</div>
                          </div>
                          <button
                            onClick={()=>onCopy(sh.texto_corrigido,"shield_copy")}
                            style={{background:copied==="shield_copy"?C.successDim:C.goldDim,border:`1px solid ${copied==="shield_copy"?C.success:C.gold}50`,borderRadius:8,padding:"7px 16px",color:copied==="shield_copy"?C.success:C.gold,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                            {copied==="shield_copy"?"✓ Copiado!":"📋 Copiar"}
                          </button>
                        </div>
                        <div style={{padding:18,fontSize:14,color:C.text,lineHeight:1.8,background:C.success+"05"}}>
                          {sh.texto_corrigido}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"24px 20px",textAlign:"center",marginTop:40}}>
        <div style={{fontSize:9,letterSpacing:6,color:C.gold,marginBottom:6}}>
          ⚡ MODO ULTRA CONVERTER MILHÕES
        </div>
        <div style={{fontSize:11,color:C.textDim}}>
          OpenRouter · Grok · Gemini · POV 10S · Coringa · Hooks 12 Padrões · Villain · Meta · Veo 3 · Agent · Shield
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;}
        body{margin:0;background:#000;}
        select option{background:#111;color:#f0ece4;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#000;}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
        input::placeholder,textarea::placeholder{color:#444;}
        input[type="range"]{accent-color:#ffd700;width:100%;}
      `}</style>
    </div>
  );
}
