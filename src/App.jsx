import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function sanitizeJson(raw) {
  let out = "", inStr = false, escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === "\\") { out += ch; escaped = true; continue; }
    if (ch === '"') {
      if (!inStr) { inStr = true; out += ch; continue; }
      let j = i + 1;
      while (j < raw.length && raw[j] === " ") j++;
      const next = raw[j];
      if (next === ":" || next === "," || next === "}" || next === "]") { inStr = false; out += ch; }
      else { out += '\\"'; }
      continue;
    }
    if (inStr && (ch === "\n" || ch === "\r" || ch === "\t")) { out += " "; continue; }
    if (inStr && ch.charCodeAt(0) < 32) continue;
    out += ch;
  }
  return out.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
}

// ═══════════════════════════════════════════════════════════
// API — MULTI PROVIDER
// ═══════════════════════════════════════════════════════════

const KEYS_KEY = "tiktok_supreme_keys_v2";
const getKeys  = () => { try { return JSON.parse(localStorage.getItem(KEYS_KEY)||"{}"); } catch { return {}; } };
const saveKeys = (k) => localStorage.setItem(KEYS_KEY, JSON.stringify(k));
const getKey   = (provider) => getKeys()[provider] || "";
const setKey   = (provider, val) => { const k=getKeys(); k[provider]=val; saveKeys(k); };

const PROVIDER_KEY = "tiktok_supreme_provider";
const getProvider  = () => localStorage.getItem(PROVIDER_KEY) || "openrouter";
const saveProvider = (p) => localStorage.setItem(PROVIDER_KEY, p);

const PROVIDERS_CFG = {
  openrouter: {
    name: "⚡ OpenRouter",
    sub: "Gemini 2.5 Flash grátis · Funciona direto no browser",
    keyUrl: "https://openrouter.ai/settings/keys",
    model: "google/gemini-2.5-flash",
    free: true,
  },
  gemini: {
    name: "🆓 Gemini Direto",
    sub: "Google AI Studio · 100% gratuito",
    keyUrl: "https://aistudio.google.com/apikey",
    model: "gemini-2.5-flash",
    free: true,
  },
  grok: {
    name: "🤖 Grok 4 (xAI)",
    sub: "Grok 4 · api.x.ai · Pago",
    keyUrl: "https://console.x.ai",
    model: "grok-4",
    free: false,
  },
  anthropic: {
    name: "🟣 Claude (Anthropic)",
    sub: "Claude Sonnet 4 · Requer proxy local · npm run dev",
    keyUrl: "https://console.anthropic.com/keys",
    model: "claude-sonnet-4-20250514",
    free: false,
  },
};

async function callOpenRouter(key, prompt, max_tokens = 3000) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "TikTok Supreme",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens,
      temperature: 0.9,
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return d.choices?.[0]?.message?.content || "";
}

async function callGrok(key, prompt, max_tokens = 4000) {
  const r = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-4",
      max_output_tokens: max_tokens,
      input: prompt,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || `Erro Grok ${r.status}`);
  if (d.output) {
    for (const block of d.output) {
      if (block.type === "message" && block.content) {
        for (const c of block.content) {
          if (c.type === "output_text" && c.text) return c.text;
        }
      }
    }
  }
  if (d.output_text)                    return d.output_text;
  if (d.content?.[0]?.text)             return d.content[0].text;
  if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
  throw new Error("Resposta vazia do Grok");
}

async function callGeminiDirect(key, prompt, max_tokens = 4000) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: max_tokens, temperature: 0.9 },
      }),
    }
  );
  const d = await r.json();
  if (d.error) {
    if (d.error.code === 429) {
      const retry = d.error.details?.find(x=>x["@type"]?.includes("RetryInfo"))?.retryDelay;
      const secs  = retry ? parseInt(retry) : 60;
      throw new Error(`⏳ Quota Gemini excedida. Aguarde ${secs}s e tente novamente. (free tier tem limite por minuto)`);
    }
    throw new Error(d.error.message || JSON.stringify(d.error));
  }
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAnthropicProxy(key, prompt, max_tokens = 4000) {
  const r = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return d.content?.map(b => b.text || "").join("") || "";
}

async function callAI(prompt, max_tokens = 4000) {
  const provider = getProvider();
  const key = getKey(provider);
  if (!key) throw new Error(`API Key não configurada. Clique em ⚙️ Configurar.`);
  if (provider === "openrouter") return callOpenRouter(key, prompt, max_tokens);
  if (provider === "gemini")     return callGeminiDirect(key, prompt, max_tokens);
  if (provider === "grok")       return callGrok(key, prompt, max_tokens);
  if (provider === "anthropic")  return callAnthropicProxy(key, prompt, max_tokens);
  throw new Error("Provider desconhecido: " + provider);
}

async function callJSON(prompt, max_tokens = 4000) {
  const raw = await callAI(
    prompt + "\n\n⚠️ CRÍTICO: RESPONDA APENAS JSON PURO. SEM ```json SEM ``` SEM markdown SEM texto antes ou depois.",
    max_tokens
  );

  let c = raw.replace(/```json|```/gi, "").trim();

  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s !== -1 && e !== -1) c = c.slice(s, e + 1);

  const fixJSON = (str) => {
    let opens = 0, openArr = 0;
    for (const ch of str) {
      if (ch === "{") opens++;
      if (ch === "}") opens--;
      if (ch === "[") openArr++;
      if (ch === "]") openArr--;
    }
    str = str.replace(/,(\s*[}\]])/g, "$1");
    for (let i = 0; i < openArr; i++) str += "]";
    for (let i = 0; i < opens;   i++) str += "}";
    return str;
  };

  try { return JSON.parse(c); } catch {}
  try { return JSON.parse(fixJSON(c)); } catch {}
  try {
    const clean = c.replace(/[""]/g, '"').replace(/[\u0000-\u001F\u007F]/g, " ");
    return JSON.parse(fixJSON(sanitizeJson(clean)));
  } catch(e) {
    const preview = raw.slice(0, 200).replace(/\n/g, " ");
    throw new Error(`JSON inválido. Resposta recebida: "${preview}..."`);
  }
}

async function callGeminiVideo(key, fileUri, mimeType, cloneProd, UGC_SYSTEM) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: UGC_SYSTEM }] },
        contents: [{ parts: [
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
          { text: `Analyze this UGC product video and generate the motion prompt.${cloneProd ? `\nProduct being held: ${cloneProd}` : ""}` },
        ]}],
        generation_config: { max_output_tokens: 2000, temperature: 0.4 },
      }),
    }
  );
  const d = await r.json();
  if (d.error) {
    if (d.error.code === 429) {
      const retry = d.error.details?.find(x=>x["@type"]?.includes("RetryInfo"))?.retryDelay;
      const secs  = retry ? parseInt(retry) : 60;
      throw new Error(`⏳ Quota Gemini excedida. Aguarde ${secs}s e tente novamente.`);
    }
    throw new Error(d.error.message || JSON.stringify(d.error));
  }
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

// ═══════════════════════════════════════════════════════════
// AVATARES (SEUS 8 AVATARES ORIGINAIS)
// ═══════════════════════════════════════════════════════════
const AVATARES = {
  "1": {
    nome: "Cowboy musculoso na cerca",
    prompt: "A muscular man, appearing to be of Hispanic ethnicity and in his late twenties to early thirties, is centered in the frame, leaning against a wooden fence. He wears a white cowboy hat, blue denim jeans, and a detailed brown leather belt with a large silver buckle featuring an embossed bull. He is shirtless, revealing a toned physique. His facial features include a dark, well-groomed beard and mustache, dark hair, and a friendly, confident smile directed at the viewer. His left hand rests casually in his jeans pocket, while his right arm is bent and resting on the fence. The background depicts a rustic outdoor setting with trees and a weathered wooden structure, bathed in warm, natural sunlight that highlights his skin and musculature. The perspective is a medium shot, slightly from below, emphasizing his strong presence. The overall atmosphere is one of rugged charm and confident masculinity, with a focus on his physique and country attire."
  },
  "2": {
    nome: "Cowboy com laço e celeiro",
    prompt: "A shirtless, muscular, adult male of likely Hispanic ethnicity with dark hair and a beard smiles broadly as he leans against a wooden fence. He wears a light beige cowboy hat, blue jeans, a brown leather belt with an ornate buckle, and two silver necklaces. He holds a lasso and a pair of tan leather gloves. His body is lean and athletic. The background is a ranch scene with horses blurred in the distance, hay bales, and a red barn under a bright, sunny sky, with dust motes visible in the air. The man is positioned slightly to the right of the frame, facing his left in a three-quarter profile. The perspective is eye-level, with a shallow depth of field that blurs the background and highlights the subject. The lighting is bright and natural, casting a warm glow. The atmosphere is casual and rustic."
  },
  "3": {
    nome: "Cowboy jovem sorrindo no celeiro",
    prompt: "A young adult man, appearing to be in his late 20s to early 30s, with olive ethnicity, a fit and muscular build, stands centered in the frame. He is wearing a white cowboy hat, dark blue jeans with a studded leather belt and a large, ornate buckle, and a silver chain necklace. He has short, dark hair, a neatly trimmed beard and mustache, and a bright, genuine smile with white teeth. His hands are casually placed in his jean pockets, and he is facing slightly towards the viewer but looking directly at the camera. The setting is a rustic farm with an old wooden barn in the background and hay bales to the left. The lighting is warm and natural, suggesting late afternoon sunlight, which highlights his physique and casts gentle shadows. The perspective is eye-level, creating an intimate and inviting atmosphere. The overall style is photorealistic, capturing a sense of confident masculinity and rural charm."
  },
  "4": {
    nome: "Homem maduro selfie com carro aberto",
    prompt: "A middle-aged man with salt-and-pepper hair and a beard, wearing a denim shirt, is taking a selfie outdoors. He has a warm smile and is looking directly at the camera. Behind him, the door of a car is open, and the background shows a rural landscape with fields and a clear sky during sunset, casting a warm, golden light. The overall mood is relaxed and pleasant."
  },
  "5": {
    nome: "Homem agro premium estrada de terra",
    prompt: "Homem brasileiro maduro de aproximadamente 50 anos, extremamente atraente, barba grisalha bem desenhada, cabelo sal e pimenta volumoso penteado para trás, sorriso leve e olhar confiante. Ele está tirando uma selfie com o braço estendido ao lado de uma caminhonete preta em uma estrada de terra no meio da fazenda. Usa camisa jeans azul clara de manga longa levemente aberta no peito. Fundo com plantações verdes, horizonte aberto e céu limpo no pôr do sol. Luz golden hour cinematográfica iluminando o rosto, atmosfera rural sofisticada, estilo agro premium, ultra realista, textura de pele natural, fotografia lifestyle de luxo, profundidade de campo suave, estética masculina elegante e autêntica, qualidade 8k."
  },
  "6": {
    nome: "Homem agro de luxo no curral",
    prompt: "Homem brasileiro maduro de 50 anos, muito elegante e carismático, barba grisalha perfeitamente alinhada, cabelo grisalho moderno com volume, sorriso marcante e olhar seguro. Tirando selfie em um curral de fazenda durante o pôr do sol. Usa camisa social vermelha aberta no colarinho com correntes douradas discretas no peito. Ao fundo há bois, cercas rurais, colinas verdes e uma caminhonete preta estacionada. Iluminação dourada intensa da golden hour, visual agro de luxo, aparência de empresário rural bem-sucedido, fotografia hiper-realista, tons quentes, estética cinematográfica, ultra detailed, realistic skin texture, 8k."
  },
  "7": {
    nome: "Homem maduro musculoso sem camisa",
    prompt: "Homem brasileiro maduro extremamente atraente de aproximadamente 50 anos, físico musculoso e definido, peito largo, ombros fortes, barba grisalha curta e elegante, cabelo sal e pimenta penteado para trás. Expressão séria e intensa olhando diretamente para a câmera. Tirando selfie sem camisa em uma varanda de fazenda de madeira. Fundo com cerca rural, árvores e campo aberto ao entardecer. Luz natural dourada lateral destacando definição muscular e textura da pele. Atmosfera masculina sofisticada, sensualidade madura, estética rural premium, fotografia ultra realista, cinematic lighting, shallow depth of field, 8k."
  },
  "8": {
    nome: "Homem maduro confiável de polo azul",
    prompt: "Homem brasileiro maduro de cerca de 50 anos, aparência amigável e confiável, barba grisalha curta e bem cuidada, cabelo escuro grisalho penteado de forma elegante. Gravando selfie ao ar livre em ambiente rural. Usa camisa polo azul-marinho escura e corrente fina dourada com crucifixo. Ao fundo há caminhonetes estacionadas e uma construção rural simples de madeira. Luz solar quente da manhã/tarde iluminando o rosto naturalmente. Visual conservador sofisticado, estilo homem do campo moderno, ultra realistic photography, natural skin texture, lifestyle agro brasileiro, cinematic realism, 8k."
  }
};

// ═══════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════
const NICHOS = [
  { id:"beleza",     label:"Beleza e cuidados pessoais",              emoji:"💄", tags:["#Beleza","#CuidadosPessoais","#Skincare","#Maquiagem","#TikTokShop"] },
  { id:"roupas",     label:"Roupas femininas e roupas íntimas",        emoji:"👗", tags:["#ModaFeminina","#RoupasIntimas","#Look","#Estilo","#TikTokShop"] },
  { id:"saude",      label:"Saúde",                                   emoji:"🏥", tags:["#Saude","#BemEstar","#SuplementoNatural","#VidaSaudavel","#TikTokShop"] },
  { id:"acessorios", label:"Acessórios de moda",                      emoji:"👜", tags:["#Acessorios","#Bolsa","#Joias","#ModaBR","#TikTokShop"] },
  { id:"esportes",   label:"Esportes e atividades ao ar livre",       emoji:"🏋️", tags:["#Esportes","#Fitness","#AtividadeFisica","#Treino","#TikTokShop"] },
  { id:"eletronicos",label:"Telefones e eletrônicos",                 emoji:"📱", tags:["#Eletronicos","#Tecnologia","#Smartphone","#GadgetsBR","#TikTokShop"] },
  { id:"casa",       label:"Suprimentos domésticos",                  emoji:"🏠", tags:["#CasaOrganizada","#Utilidades","#LimpezaCasa","#HomeDecor","#TikTokShop"] },
  { id:"alimentos",  label:"Alimentos e bebidas",                     emoji:"🍎", tags:["#AlimentosSaudaveis","#Bebidas","#FoodTikTok","#Nutricao","#TikTokShop"] },
  { id:"automotivo", label:"Automotivo e moto",                       emoji:"🚗", tags:["#Automotivo","#Carro","#Moto","#AcessoriosAuto","#TikTokShop"] },
  { id:"bebes",      label:"Bebês e maternidade",                     emoji:"👶", tags:["#Maternidade","#Bebe","#MamaeeTikTok","#BabyShop","#TikTokShop"] },
  { id:"pet",        label:"Pets",                                    emoji:"🐾", tags:["#Pet","#CachorroTikTok","#GatoTikTok","#PetShop","#TikTokShop"] },
  { id:"ferramentas",label:"Ferramentas e melhorias para o lar",      emoji:"🔧", tags:["#Ferramentas","#BricolageBR","#MelhoriaLar","#DIY","#TikTokShop"] },
];

const PADROES_MILLION = [
  {id:"pattern_interrupt", nome:"Interrupção de Padrão",  emoji:"⚡", formula:"[Ação inesperada] + [Benefício oculto]",              ctr:"8.5%",  quando:"Uso não-óbvio, benefício contraintuitivo"},
  {id:"hidden_pain",       nome:"Dor Invisível",           emoji:"🎯", formula:"Se [sintoma sutil], você tem [problema sério]",       ctr:"9.2%",  quando:"Problema que pessoa não sabia que tinha"},
  {id:"critical_window",  nome:"Timing Crítico",           emoji:"⏰", formula:"[Grupo] tem até [deadline] para [ação]",              ctr:"12.3%", quando:"Sazonalidade, faixa etária, janela"},
  {id:"villain_reversal",  nome:"Inversão Vilão",           emoji:"🔄", formula:"Solução vendida é o problema",                       ctr:"15.7%", quando:"Produto superior ao padrão mercado"},
  {id:"social_proof",      nome:"Prova Social Extrema",     emoji:"👥", formula:"[Número massivo] + [Ação] + [Resultado]",            ctr:"10.2%", quando:"Produto viral, tendência comprovada"},
  {id:"science_reveal",    nome:"Descoberta Científica",    emoji:"🔬", formula:"Estudo comprovou: [fato chocante]",                  ctr:"11.8%", quando:"Ingrediente diferenciado, método validado"},
  {id:"fatal_mistake",     nome:"Erro Comum Fatal",         emoji:"❌", formula:"Todo mundo faz e tá destruindo [resultado]",         ctr:"13.8%", quando:"Uso específico, técnica de aplicação"},
  {id:"instant_transform", nome:"Transformação Imediata",   emoji:"⚡", formula:"Em [tempo curto] isso aconteceu...",                 ctr:"14.5%", quando:"Resultado rápido real, mudança visível"},
  {id:"insider_secret",    nome:"Segredo de Insider",       emoji:"🔓", formula:"[Profissional] não quer que saiba...",               ctr:"16.2%", quando:"Produto barato = resultado caro"},
  {id:"shocking_comparison",nome:"Comparação Chocante",     emoji:"💰", formula:"Custa menos que [banal] e faz [incrível]",           ctr:"10.8%", quando:"Produto barato, ROI alto, ticket <R$50"},
  {id:"triple_threat",     nome:"Problema Triplo",          emoji:"🎲", formula:"Se tem [P1], [P2] e [P3]...",                       ctr:"12.5%", quando:"Produto multifuncional, solução abrangente"},
  {id:"impossible_question",nome:"Pergunta Impossível",     emoji:"❓", formula:"Por que [ruim] se você faz [certo]?",               ctr:"13.1%", quando:"Frustração comum, esforço sem resultado"},
];

const CATEGORIAS = [
  "Beleza e cuidados pessoais",
  "Roupas femininas e roupas íntimas femininas",
  "Saúde",
  "Acessórios de moda",
  "Esportes e atividades ao ar livre",
  "Telefones e eletrônicos",
  "Suprimentos domésticos",
  "Alimentos e bebidas",
  "Automotivo e moto",
  "Bebês e maternidade",
  "Pets",
  "Ferramentas e melhorias para o lar",
];

const SCRIPT_PHASES = [
  { key:"hook",      label:"Hook",           emoji:"⚡", dur:"0–4s",   cor:"#ffd700", desc:"Para o scroll em 0.5s" },
  { key:"validacao", label:"Validação",      emoji:"🤝", dur:"4–10s",  cor:"#c084fc", desc:"Valida a dor, gera empatia" },
  { key:"produto",   label:"Produto",        emoji:"📦", dur:"10–25s", cor:"#60a5fa", desc:"Apresenta a solução" },
  { key:"beneficio", label:"Benefício Extra",emoji:"✨", dur:"25–31s", cor:"#00ff88", desc:"Reforça com benefício bônus" },
  { key:"cta",       label:"CTA",            emoji:"👆", dur:"31–35s", cor:"#f87171", desc:"Direciona à ação" },
];

// ═══════════════════════════════════════════════════════════
// BLINDADOR
// ═══════════════════════════════════════════════════════════
const BLINDADOR = `
BLINDADOR ULTRA TIKTOK SHOP BR - OBRIGATÓRIO:
❌ NUNCA: "remove","cura","elimina","100%","garantido","milagre","emagrece","queima gordura","trata doença","efeito botox","regenera","anti-inflamatório","médicos odeiam"
✅ SEMPRE: "ajuda","auxilia","melhora","contribui","fortalece","complementa","pode ajudar"
✅ CTA: SEMPRE "carrinho laranja" (NUNCA amarelo)
✅ Tom: experiência pessoal, rotina, textura — NÃO promessas
✅ Timeframes: mínimo 2-3 semanas
✅ Linguagem coloquial BR natural
NÃO NEGOCIÁVEL.
`;

// ═══════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════
const buildUser = (f) =>
  `Produto: ${f.nome}\nValor: R$${f.valor}\nCategoria: ${f.categoria}\nDescrição: ${f.descricao}${f.copyViral ? `\n\n📺 COPY VIRAL REFERÊNCIA:\n"${f.copyViral}"\nModele esta estrutura.` : ""}${f.seoKeyword ? `\n\n🔍 SEO TIKTOK SEARCH INSIGHTS — PALAVRA-CHAVE OBRIGATÓRIA: "${f.seoKeyword}"\n⚠️ REGRA ABSOLUTA DE SEO: Esta palavra-chave DEVE aparecer EXATAMENTE assim (sem variações) em:\n1. O HOOK (primeiras palavras do vídeo — texto na tela E fala)\n2. A FALA/ROTEIRO narrado (ao menos uma vez)\n3. A LEGENDA/CAPTION do vídeo\nO TikTok indexa pelo texto exato. NÃO NEGOCIÁVEL.` : ""}`;

const P_HOOKS = (n, blind) => `Você é especialista em TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
Gere ${n} POV hooks científicos. JSON PURO:
{"pov_hooks":[{"numero":1,"padrao":"Problema→Solução","hook":"...","estrutura":"...","por_que_funciona":"...","quando_usar":"...","score_probabilidade":85,"ctr_esperado":"12-15%","palavras":8}]}`;

const P_ROTEIROS = (n, blind, hookRef = "") => `Você é especialista em TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
${hookRef ? `HOOK DE REFERÊNCIA: "${hookRef}"\nUse este hook como ponto de partida.\n` : ""}
Gere ${n} roteiros completos. Cada roteiro: MÁXIMO 35 palavras totais na narração. Estrutura 5 fases + contexto Villain/Hero. JSON PURO:
{"roteiros":[{"numero":1,"titulo":"Nome criativo","duracao":"35s","pov_hook":"...","hook":{"fala":"..."},"validacao":{"fala":"..."},"produto":{"fala":"..."},"beneficio":{"fala":"..."},"cta":{"fala":"..."},"roteiro_narrado":"narração completa de todas as falas juntas","villain":"...","hero":"...","proof":"...","legenda_seo":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"]}]}`;

const P_LEGENDAS = (n, nicho, blind) => `Você é especialista em TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
Nicho: ${nicho.label} | Tags do nicho: ${nicho.tags.join(", ")}
Gere ${n} variações de legenda + hashtags para TikTok Shop Brasil. Regras:
- Legenda: 2-3 linhas curtas, português coloquial, gancho + benefício + CTA pro carrinho
- CTA dentro do TikTok: "pelo carrinho abaixo" ou "link do produto aqui"
- Sem urgência falsa, sem claims médicos
- Hashtags: exatamente 5, mix de nicho + shop + produto
JSON PURO:
{"legendas":[{"numero":1,"legenda":"texto da legenda","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"gancho_tipo":"nome do gancho","por_que_funciona":"explicação curta"}]}`;

const P_CORINGA = (n, blind) => `Você é especialista em TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
Gere ${n} variações formato coringa (base: vídeos 214k+ views).
Estrutura: negativas + produto ORIGINAL + preço + CTA urgente "carrinho laranja". 25-35 palavras cada. JSON PURO:
{"formato_coringa":[{"numero":1,"roteiro":"...","estrutura":"...","quando_usar":"..."}]}`;

const P_META = (n, blind) => `Você é especialista em Meta Ads com $1M+ em ad spend, TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
Gere ${n} hooks Meta Ads testados. JSON PURO:
{"meta_hooks":[{"numero":1,"padrao":"Problema Salvo","hook":"...","script_completo":"...","por_que_converte":"...","nivel_conversao":"ALTO"}]}`;

const P_VEO = (n, blind) => `Você é especialista em TikTok Shop Brasil.
${blind ? BLINDADOR : ""}
Gere ${n} scripts para geração de vídeo IA (Veo 3). Tom UGC natural, 25-35 palavras. JSON PURO:
{"scripts_veo":[{"numero":1,"tom":"natural","script":"...","palavras":28}]}`;

const P_CBO = (n, blind) => `Você é especialista em TikTok Shop Brasil, escala científica CBO.
${blind ? BLINDADOR : ""}
Analise o script vencedor e gere ${n} variações científicas. Varie: pain language, emotion words, timeframes, social proof. Mantenha estrutura. JSON PURO:
{"analise":{"padrao":"...","estrutura":"..."},"variacoes":[{"numero":1,"tipo":"Pain Language","hook":"...","roteiro":"...","legenda":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"],"mudanca":"X→Y"}]}`;

const P_AGENT = () => `Você é o AGENT FINDER 2.0 - especialista em produtos TikTok Shop Brasil.
Analise o produto e retorne score de viabilidade. JSON PURO:
{"agent":{"score":85,"demanda":"Alta","concorrencia":"Média","ticket_medio":"...","comissao_estimada":"15-20%","tendencia_30d":"+45%","recomendacao":"VERDE - Alta probabilidade","angulos_matadores":["...","...","..."],"path_10k":"X vendas/dia × R$Y = R$10k/mês"}}`;

const P_SHIELD = () => `Você é especialista em compliance TikTok Shop Brasil. Analise o texto e corrija violações.
Score: 100=perfeito, 80+=ok, 60-79=atenção, <60=risco. JSON PURO:
{"shield":{"score":85,"nivel":"VERDE","violacoes":["..."],"pontos_positivos":["..."],"texto_corrigido":"...","resumo":"..."}}`;

const P_MONET = (persona, qtd) => {
  const isFazendeiro = persona === "fazendeiro";
  return `Você é especialista em crescimento orgânico no TikTok Brasil, nicho rural/roça.

PERSONA: ${isFazendeiro
    ? "FAZENDEIRO RICO — homem rústico, dono de terra, carinhoso, maduro, seduz mulheres para que o sigam e engajem"
    : "MENINA DA ROÇA — mulher simples, trabalhadora, autêntica, seduz homens maduros para que a sigam e engajem"}

OBJETIVO: Atingir 2.000 seguidores com vídeos de engajamento máximo.

REGRAS ABSOLUTAS:
- MÁXIMO 40 palavras por roteiro (conte sempre!)
- CTA obrigatório: sempre incluir seguir + curtir + comentar
- Tom: ${isFazendeiro ? "rústico, protetor, sedutor, homem de verdade" : "simples, autêntica, direta, mulher do campo"}
- Linguagem coloquial do interior BR
- Sem palavrões, sem conteúdo explícito
- Variações de arquétipos: ${isFazendeiro
    ? "O Protetor / O Sedutor / O Direto / O Romântico / O Ostentador Rural"
    : "A Desafiadora / A Romântica / A Direta / A Trabalhadora / A Carente"}

REFERÊNCIAS DE QUALIDADE (estilo certo):
Fazendeiro: "A vida no campo é boa, mas falta uma rainha para cuidar desse império comigo. Quer ser dona do meu coração? Curta, siga e comente: EU QUERO!"
Menina: "Cuido de boi, cuido de fazenda, cuido de tudo... mas ninguém cuida de mim. Você se habilita? Me segue, curta e deixa um oi aqui!"

Gere ${qtd} roteiros DIFERENTES entre si, variando o arquétipo. JSON PURO:
{"roteiros":[{"numero":1,"arquetipo":"O Protetor","roteiro":"...","palavras":32,"cta_principal":"Curta, siga e comente EU QUERO","hook_tipo":"emocional"}]}`;
};

const buildFinderPrompt = (txt) => `Você é especialista em análise de produtos TikTok Shop Brasil via FastMoss e Kalodata.

FORMATOS QUE VOCÊ RECONHECE:

KALODATA — colunas nessa ordem:
"Nome do produto | Preço R$ | Revenue R$k | Revenue Growth Rate % | Item Sold | Avg Unit Price | Commission Rate % | Creator Count | Launch Date | Creator Conversion Rate"
Exemplo: "Kit Pro3Magnesio R$79.90 | R$117.40k | 82% | 2.34k | R$50.17 | 10% | 564 | 09/06/2025 | 40.78%"

FASTMOSS — colunas nessa ordem:
"Nome | Preço | País | Loja | Categoria | Comissão | Volume Vendas 7d | Variação% | Receita | Vendas Totais | GMV Total"
Exemplo: "Henna Labial Makiaj R$31.05 | 138 | 3350% | R$4.2 mil | 2.2 mil | R$54.6 mil"

REGRAS DE SCORE (0-100):
- Crescimento >500% = 35 pts | 100-500% = 25 pts | 70-100% = 15 pts
- Comissao >10% = 20 pts | 8-10% = 12 pts | <8% = 5 pts
- Creators >100 = 15 pts | 20-100 = 10 pts | <20 = 3 pts
- Preco R$20-R$100 = 15 pts (ticket ideal afiliado)
- Conversao creator >50% = 15 pts | 30-50% = 10 pts

CLASSIFICACAO:
90-100 = OURO ESCONDIDO | 75-89 = CAVALO DE GUERRA | 60-74 = FOGUETE | 40-59 = VIAVEL | <40 = IGNORAR

DADOS COLADOS PELO USUARIO:
${txt}

INSTRUCOES:
1. Leia os dados acima e extraia TODOS os produtos que encontrar
2. Para cada produto calcule o score
3. Ordene do maior para o menor score
4. Se a comissao estiver como "-" assuma 0%
5. Converta valores como "2.34k" para 2340, "R$117.40k" para 117400

RETORNE APENAS ESTE JSON SEM NENHUM TEXTO ANTES OU DEPOIS:
{"produtos":[{"nome":"nome completo do produto","categoria":"categoria","valor":"R$XX,XX","crescimento":"+XXX%","vendas7d":1000,"comissao_percentual":10,"comissao_por_venda":"R$X,XX","score":85,"classificacao":"CAVALO DE GUERRA","por_que":"motivo do score","path_10k":"X vendas/dia = R$10k/mes","angulos":["angulo 1","angulo 2","angulo 3"],"descricao":"descricao breve do produto"}],"top3":[{"posicao":1,"nome":"produto","score":92},{"posicao":2,"nome":"produto","score":85},{"posicao":3,"nome":"produto","score":78}],"resumo":{"total":10,"ouro":1,"cavalo":3,"foguete":4,"viavel":2,"ignorar":0}}`;

// ═══════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════
const C = {
  bg:"#040406", card:"#0a0a0e", card2:"#060609", border:"#18181e",
  text:"#f0ede8", dim:"#555", mid:"#888",
  gold:"#ffd700", goldd:"#ffd70018",
  pink:"#ff1493", pinkd:"#ff149318",
  green:"#00ff88", greend:"#00ff8818",
  blue:"#00bfff", blued:"#00bfff18",
  purple:"#c084fc", purpled:"#c084fc18",
  orange:"#ff9800", oranged:"#ff980018",
  teal:"#2dd4bf", teald:"#2dd4bf18",
};
const font = "'DM Mono','Fira Mono','Courier New',monospace";
const fontSans = "'DM Sans','Segoe UI',sans-serif";

const scoreColor = s => s >= 80 ? C.green : s >= 60 ? C.orange : C.mid;
const scoreBg   = s => s >= 80 ? C.greend : s >= 60 ? C.oranged : "#ffffff0a";

const inp = (ex={}) => ({
  width:"100%", boxSizing:"border-box", background:C.card2, border:`1px solid ${C.border}`,
  borderRadius:10, padding:"11px 14px", color:C.text, fontSize:13, fontFamily:fontSans, outline:"none", ...ex
});

const Btn = ({onClick, disabled, color=C.gold, children, style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:disabled?C.card2:color, border:"none", borderRadius:10, padding:"11px 18px",
    color:disabled?C.dim:"#000", fontSize:12, fontWeight:700, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", opacity:disabled?.5:1, transition:"all .2s", ...style
  }}>{children}</button>
);

const Badge = ({children, color=C.gold}) => (
  <span style={{fontSize:9, color, background:color+"15", border:`1px solid ${color}30`,
    padding:"3px 10px", borderRadius:20, letterSpacing:2, fontWeight:700, display:"inline-block", marginBottom:8}}>
    {children}
  </span>
);

const CopyBox = ({label, content, id, copied, onCopy, color=C.gold, large=false}) => {
  if (!content) return null;
  const ok = copied===id;
  return (
    <div onClick={()=>onCopy(content,id)} style={{
      background:color+"08", border:`1px solid ${ok?C.green:color+"30"}`, borderRadius:10,
      padding:"11px 14px", cursor:"pointer", marginBottom:9, transition:"all .2s"
    }}>
      <div style={{fontSize:8, color, letterSpacing:3, marginBottom:5, fontWeight:600}}>{label}</div>
      <div style={{fontSize:large?15:12, fontWeight:large?700:400, lineHeight:1.7, color:C.text, whiteSpace:"pre-wrap"}}>{content}</div>
      <div style={{fontSize:9, color:ok?C.green:C.dim, marginTop:6}}>{ok?"✓ copiado!":"clique para copiar"}</div>
    </div>
  );
};

const ScoreBar = ({score}) => (
  <div style={{height:3, background:"rgba(255,255,255,0.07)", borderRadius:2, marginBottom:12}}>
    <div style={{height:"100%", width:`${score}%`, background:scoreColor(score), borderRadius:2, transition:"width .6s ease"}}/>
  </div>
);

const ErrBox = ({msg}) => (
  <div style={{padding:"10px 14px", background:"#ff149318", border:"1px solid #ff149340", borderRadius:8, fontSize:12, color:"#ff1493", marginBottom:12}}>⚠️ {msg}</div>
);

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [aba, setAba]               = useState("fastmoss");
  const [form, setForm]             = useState({nome:"",valor:"",categoria:"Beleza e cuidados pessoais",descricao:"",copyViral:"",seoKeyword:""});
  const [nichoSel, setNichoSel]     = useState("beleza");
  const [blind, setBlind]           = useState(true);
  const [qtd, setQtd]               = useState(5);
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState(null);
  const [res, setRes]               = useState({});
  const [copied, setCopied]         = useState(null);
  const [shieldTxt, setShieldTxt]   = useState("");
  const [cboScript, setCboScript]   = useState("");
  const [cboQtd, setCboQtd]         = useState(10);
  const [padroesSel, setPadroesSel] = useState(new Set());
  const [finderTxt, setFinderTxt]   = useState("");
  const [finderRes, setFinderRes]   = useState(null);
  const [hookSelecionado, setHookSelecionado] = useState("");
  const [qtdLegendas, setQtdLegendas]         = useState(3);
  const [monetPersona, setMonetPersona]       = useState("fazendeiro");
  const [monetQtd, setMonetQtd]               = useState(10);

  // ── API STATUS / CONFIG ──
  const [activeProvider, setActiveProvider] = useState(getProvider);
  const [keys,           setKeys]           = useState(getKeys);
  const [apiStatus,      setApiStatus]      = useState("idle");
  const [apiLatency,     setApiLatency]     = useState(null);
  const [apiError,       setApiError]       = useState("");
  const [showKeyModal,   setShowKeyModal]   = useState(false);
  const [showKeyInput,   setShowKeyInput]   = useState(false);
  const [geminiStatus,   setGeminiStatus]   = useState("idle");
  const [geminiLatency,  setGeminiLatency]  = useState(null);

  const changeProvider = (p) => {
    saveProvider(p); setActiveProvider(p);
    setApiStatus("idle"); setApiError("");
  };

  const updateKey = (provider, val) => {
    const k = {...keys, [provider]: val};
    setKeys(k); saveKeys(k);
  };

  const salvarKey = (provider, val) => {
    updateKey(provider, val);
    setShowKeyModal(false);
    testarAI();
  };

  const testarAI = async () => {
    const provider = getProvider();
    const key = getKey(provider);
    if (!key) { setApiStatus("error"); setApiError("Sem API Key"); return; }
    setApiStatus("testing"); setApiLatency(null); setApiError("");
    const t0 = Date.now();
    try {
      let raw = "";
      if (provider === "openrouter") raw = await callOpenRouter(key, "responda apenas: ok", 5);
      if (provider === "gemini")     raw = await callGeminiDirect(key, "responda apenas: ok", 5);
      if (provider === "grok")       raw = await callGrok(key, "responda apenas: ok", 10);
      if (provider === "anthropic")  raw = await callAnthropicProxy(key, "responda apenas: ok", 5);
      if (raw) { setApiStatus("ok"); setApiLatency(Date.now()-t0); }
      else { setApiStatus("error"); setApiError("Sem resposta"); }
    } catch(e) { setApiStatus("error"); setApiError(e.message); }
  };

  const testarGemini = async (key) => {
    if (!key?.trim()) return;
    setGeminiStatus("testing"); setGeminiLatency(null);
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ contents:[{parts:[{text:"ping"}]}], generationConfig:{maxOutputTokens:5} }),
      });
      const d = await r.json();
      if (d.candidates?.[0]) { setGeminiStatus("ok"); setGeminiLatency(Date.now()-t0); }
      else { setGeminiStatus("error"); }
    } catch { setGeminiStatus("error"); }
  };

  useEffect(() => {
    if (getKey(getProvider())) testarAI();
    else setApiStatus("idle");
  }, [activeProvider]);

  const onCopy = (text, id) => {
    try { navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(id);
    setTimeout(()=>setCopied(null), 1600);
  };

  const setForm2 = p => setForm(f=>({...f,...p}));
  const nicho = NICHOS.find(n=>n.id===nichoSel)||NICHOS[0];
  const s = res;

  const gerar = async (tipo) => {
    if (!form.nome||!form.valor||!form.descricao) { setErro("Preencha nome, valor e descrição!"); return; }
    setErro(null); setLoading(true);
    try {
      const user = buildUser(form);
      const prompts = {
        hooks:    P_HOOKS(qtd, blind),
        roteiros: P_ROTEIROS(qtd, blind, hookSelecionado),
        coringa:  P_CORINGA(qtd, blind),
        meta:     P_META(qtd, blind),
        veo3:     P_VEO(qtd, blind),
        agent:    P_AGENT(),
      };
      const data = await callJSON(`${prompts[tipo]}\n\n${user}`, 5000);
      setRes(r=>({...r,[tipo]:data}));
      setAba(tipo);
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const gerarLegendas = async () => {
    if (!form.nome||!form.valor) { setErro("Preencha nome e valor do produto!"); return; }
    setErro(null); setLoading(true);
    try {
      const data = await callJSON(`${P_LEGENDAS(qtdLegendas, nicho, blind)}\n\n${buildUser(form)}`, 4000);
      setRes(r=>({...r,legendas:data}));
      setAba("legendas");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const gerarCBO = async () => {
    if (!cboScript.trim()) { setErro("Cole o script vencedor!"); return; }
    setErro(null); setLoading(true);
    try {
      const data = await callJSON(`${P_CBO(cboQtd,blind)}\n\nSCRIPT VENCEDOR:\n"${cboScript}"\n\nProduto: ${form.nome||"produto"}\nCategoria: ${form.categoria}`, 6000);
      setRes(r=>({...r,cbo:data}));
      setAba("cbo");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const gerarMillion = async () => {
    if (!form.nome||!form.valor||!form.descricao) { setErro("Preencha nome, valor e descrição!"); return; }
    if (padroesSel.size===0) { setErro("Selecione pelo menos 1 padrão!"); return; }
    setErro(null); setLoading(true);
    try {
      const padroes = PADROES_MILLION.filter(p=>padroesSel.has(p.id));
      const prompt = `Você é especialista em hooks TikTok que geraram R$1M+.
${blind?BLINDADOR:""}
PRODUTO: ${form.nome} | CATEGORIA: ${form.categoria} | PREÇO: R$${form.valor}
DESCRIÇÃO: ${form.descricao}
PADRÕES SELECIONADOS:
${padroes.map(p=>`${p.emoji} ${p.nome}: ${p.formula}`).join("\n")}
Gere ${qtd} hooks científicos. Cada hook: 6-12 palavras MÁXIMO. Ordene por score (maior = melhor). JSON PURO:
{"hooks":[{"numero":1,"hook":"...","padrao_usado":"...","formula_aplicada":"...","score_probabilidade":85,"ctr_esperado":"12-15%","por_que_funciona":"...","palavras":8}]}`;
      const data = await callJSON(prompt, 5000);
      setRes(r=>({...r,million:data}));
      setAba("million");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const analisarFinder = async () => {
    if (!finderTxt.trim()) { setErro("Cole o conteúdo da página!"); return; }
    setErro(null); setLoading(true);
    try {
      const txt = finderTxt.slice(0, 12000);
      const data = await callJSON(buildFinderPrompt(txt), 8000);
      if (data?.produtos?.length > 0) {
        const emojis = {"OURO ESCONDIDO":"🏆","CAVALO DE GUERRA":"🔥","FOGUETE":"💥","VIAVEL":"✅","IGNORAR":"🔴"};
        data.produtos = data.produtos.map(p => ({
          ...p,
          classificacao: p.classificacao?.includes("🏆")||p.classificacao?.includes("🔥")
            ? p.classificacao
            : `${emojis[p.classificacao]||"✅"} ${p.classificacao}`
        }));
        setFinderRes(data);
      } else if (data) {
        setErro("O modelo retornou JSON mas sem produtos. Cole mais dados do FastMoss.");
      } else {
        setErro("Não consegui extrair produtos. Verifique o console (F12) para detalhes.");
      }
    } catch(e) {
      setErro(e.message);
    }
    setLoading(false);
  };

  const gerarShield = async () => {
    if (!shieldTxt.trim()) { setErro("Cole o texto para analisar!"); return; }
    setErro(null); setLoading(true);
    try {
      const data = await callJSON(`${P_SHIELD()}\n\nTEXTO:\n"${shieldTxt}"`);
      setRes(r=>({...r,shield:data}));
      setAba("shield");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const gerarMonet = async () => {
    setErro(null); setLoading(true);
    try {
      const data = await callJSON(P_MONET(monetPersona, monetQtd), 5000);
      setRes(r=>({...r,monet:data}));
      setAba("monet");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  // ── MODELAR ──
  const [modelarTxt, setModelarTxt]   = useState("");
  const [modelarLim, setModelarLim]   = useState(30);
  const [modelarQtd, setModelarQtd]   = useState(3);

  const gerarModelar = async () => {
    if (!modelarTxt.trim()) { setErro("Cole a transcrição do vídeo!"); return; }
    setErro(null); setLoading(true);
    try {
      const prompt = `Você é especialista em engenharia de copy UGC para TikTok Shop Brasil.

MISSÃO: Analise o roteiro original abaixo, identifique toda sua engenharia (hook, dor, solução, prova social, CTA, villain/hero, gatilhos emocionais, estrutura) e recrie ${modelarQtd} versões CONDENSADAS mantendo 100% da mesma engenharia e contexto.

REGRA ABSOLUTA: MÁXIMO ${modelarLim} PALAVRAS por versão. Conte as palavras. Se passar, corte até caber.
${blind ? BLINDADOR : ""}

ROTEIRO ORIGINAL (pode ter 2+ minutos de fala):
"${modelarTxt}"

INSTRUÇÕES:
1. Extraia o GANCHO central (o que faz parar o scroll)
2. Identifique a DOR / PROBLEMA do público
3. Identifique a SOLUÇÃO / PRODUTO apresentado
4. Identifique o CTA final
5. Identifique padrões: villain/hero, coringa, prova social, segredo de insider, etc.
6. Recrie ${modelarQtd} versões com máximo ${modelarLim} palavras cada, variando o ângulo de entrada mas mantendo o mesmo contexto
${form.seoKeyword ? `7. OBRIGATÓRIO: incluir a palavra-chave SEO "${form.seoKeyword}" em cada versão` : ""}

JSON PURO:
{
  "analise": {
    "gancho_original": "...",
    "dor_identificada": "...",
    "solucao": "...",
    "cta_original": "...",
    "engenharia": "villain/hero | coringa | prova social | etc",
    "gatilhos": ["gatilho 1","gatilho 2","gatilho 3"]
  },
  "versoes": [
    {
      "numero": 1,
      "angulo": "nome do ângulo usado",
      "roteiro": "versão condensada aqui",
      "palavras": 28,
      "hook": "primeiras palavras que param o scroll",
      "cta": "CTA final usado",
      "engenharia_aplicada": "o que foi mantido da engenharia original"
    }
  ]
}`;
      const data = await callJSON(prompt, 5000);
      setRes(r=>({...r,modelar:data}));
      setAba("modelar");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const ABAS = [
    {id:"fastmoss", label:"🇧🇷 FastMoss", cor:C.green},
    {id:"produto",  label:"📦 Produto",   cor:C.gold},
    {id:"agent",    label:"🎯 Agent",     cor:C.green},
    {id:"hooks",    label:"🎣 Hooks",     cor:C.gold},
    {id:"million",  label:"💎 Million$",  cor:C.gold},
    {id:"roteiros", label:"🎬 Roteiros",  cor:C.gold},
    {id:"coringa",  label:"🃏 Coringa",   cor:C.pink},
    {id:"meta",     label:"💰 Meta Ads",  cor:C.blue},
    {id:"legendas", label:"📝 Legendas",  cor:C.teal},
    {id:"modelar",  label:"✂️ Modelar",   cor:"#fb923c"},
    {id:"ugcclone", label:"🤲 UGC Clone", cor:"#22d3ee"},
    {id:"veo3",     label:"🚀 Veo 3",     cor:C.purple},
    {id:"cbo",      label:"📊 CBO",       cor:C.orange},
    {id:"monet",    label:"💎 Monetização", cor:"#e879f9"},
    {id:"shield",   label:"🛡️ Shield",   cor:C.green},
  ];

  // ── UGC CLONE ──
  const [cloneMode,      setCloneMode]      = useState("descricao");
  const [cloneDesc,      setCloneDesc]      = useState("");
  const [cloneProd,      setCloneProd]      = useState("");
  const [cloneRes,       setCloneRes]       = useState(null);
  const [cloneVideo,     setCloneVideo]     = useState(null);
  const [cloneFrames,    setCloneFrames]    = useState([]);
  const [cloneProgress,  setCloneProgress]  = useState("");
  const [cloneGeminiKey, setCloneGeminiKey] = useState("");
  const [showGeminiKey,  setShowGeminiKey]  = useState(false);

  const UGC_SYSTEM = `You are an advanced motion-cloning agent specialized in organic UGC hand-product videos for image-to-video generation.
Your ONLY purpose is: extracting and recreating realistic human hand motion from short viral videos while preserving the original image identity exactly.
You are a motion replication engine, hand movement analyzer, temporal pacing extractor, and organic UGC behavior system.

ABSOLUTE RULES — NEVER describe: clothing, appearance, colors, lighting, background, aesthetics, scene style, emotions, attractiveness, facial beauty, text on screen, subtitles, narration, music, voice, cinematic interpretation.
IGNORE ALL VISUAL IDENTITY ELEMENTS. The original image must remain visually identical. ONLY motion may transfer.

SPECIALIZATION — Focus ONLY on: organic UGC product handling, realistic hand movement, subtle wrist rotation, natural object interaction, casual human pacing, imperfect human rhythm, realistic micro tremor, soft pauses, product reveal timing, natural hand stabilization.

TARGET: organic handheld UGC · 10 seconds · high realism · subtle and natural motion.
AVOID: cinematic motion, exaggerated animation, overacting, robotic movement, smooth artificial motion, dramatic gestures.

MOTION DNA — Always prioritize: subtle finger adjustments, realistic wrist mechanics, soft grip transitions, slight natural tremor, casual pacing, imperfect human timing, gentle forward movement, natural hand repositioning, micro stabilization behavior, organic movement continuity.

STANDARD 10-SECOND STRUCTURE:
0s–2s: hand enters frame naturally
2s–4s: product stabilization and soft positioning
4s–6s: slow product interaction or rotation
6s–8s: gentle forward movement toward camera
8s–10s: soft final hold with micro motion

OUTPUT: Return ONLY 3 sections separated by "---SECTION---":
SECTION 1: Motion Analysis (bullet points of detected/inferred motion)
SECTION 2: Motion Behavior Summary (2-3 sentences)
SECTION 3: Final Image-to-Video Motion Prompt (one paragraph, ready to paste)

VISUAL LOCK: Preserve original image exactly. Transfer motion only.`;

  const parseCloneResult = (raw) => {
    const parts = raw.split("---SECTION---").map(s=>s.trim()).filter(Boolean);
    return { analise: parts[0]||raw, resumo: parts[1]||"", prompt: parts[2]||"", raw };
  };

  const gerarCloneDesc = async () => {
    if (!cloneDesc.trim()) { setErro("Descreva o vídeo de referência!"); return; }
    setErro(null); setLoading(true);
    try {
      const r = await fetch("/api/anthropic/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:2000, system:UGC_SYSTEM,
          messages:[{role:"user", content:
            `REFERENCE VIDEO DESCRIPTION:\n${cloneDesc}${cloneProd?`\n\nPRODUCT BEING HELD: ${cloneProd}`:""}\n\nAnalyze and generate the motion prompt for this 10-second UGC product video.`
          }],
        }),
      });
      const d = await r.json();
      const raw = d.content?.map(b=>b.text||"").join("")||"";
      setCloneRes(parseCloneResult(raw));
      setAba("ugcclone");
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const extractFrames = (file) => new Promise((resolve, reject) => {
    const video  = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d");
    const frames = [];
    video.preload  = "auto";
    video.muted    = true;
    video.src      = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      canvas.width  = Math.min(video.videoWidth,  640);
      canvas.height = Math.min(video.videoHeight, 360);
      const duration = Math.min(video.duration, 12);
      const step     = duration / 8;
      const times    = Array.from({length:8}, (_,i) => +(i * step).toFixed(2));
      let idx = 0;
      const next = () => {
        if (idx >= times.length) { URL.revokeObjectURL(video.src); resolve(frames); return; }
        video.currentTime = times[idx];
      };
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({ time: times[idx].toFixed(1)+"s", data: canvas.toDataURL("image/jpeg", 0.75).split(",")[1] });
        idx++; next();
      };
      video.onerror = reject;
      next();
    };
    video.onerror = reject;
  });

  const gerarCloneFrames = async () => {
    if (!cloneVideo) { setErro("Selecione um vídeo!"); return; }
    setErro(null); setLoading(true); setCloneFrames([]);
    try {
      setCloneProgress("🎞️ Extraindo frames do vídeo...");
      const frames = await extractFrames(cloneVideo);
      setCloneFrames(frames);
      setCloneProgress(`📡 Enviando ${frames.length} frames pro Claude Vision...`);
      const content = [
        ...frames.map((f,i) => ({
          type:"image",
          source:{ type:"base64", media_type:"image/jpeg", data:f.data }
        })),
        { type:"text", text:
          `These ${frames.length} sequential frames (extracted ~1 per second) are from a 10-second UGC product video. Frames are in chronological order.\n${cloneProd?`Product being held: ${cloneProd}\n`:""}\nAnalyze the hand motion progression across these frames. Infer movement between frames. Generate the motion prompt.`
        }
      ];
      const r = await fetch("/api/anthropic/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000, system:UGC_SYSTEM, messages:[{role:"user",content}] }),
      });
      const d = await r.json();
      const raw = d.content?.map(b=>b.text||"").join("")||"";
      setCloneRes(parseCloneResult(raw));
      setCloneProgress("");
      setAba("ugcclone");
    } catch(e) { setErro(e.message); setCloneProgress(""); }
    setLoading(false);
  };

  const gerarCloneGemini = async () => {
    if (!cloneVideo)      { setErro("Selecione um vídeo!"); return; }
    if (!cloneGeminiKey.trim()) { setErro("Informe sua Gemini API Key!"); return; }
    setErro(null); setLoading(true);
    const KEY = cloneGeminiKey.trim();
    try {
      setCloneProgress("📤 Fazendo upload do vídeo para o Gemini...");
      const uploadRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${KEY}`,
        {
          method:"POST",
          headers:{"X-Goog-Upload-Protocol":"multipart"},
          body:(() => {
            const fd = new FormData();
            fd.append("metadata", new Blob([JSON.stringify({file:{display_name:"ugc_ref.mp4"}})],{type:"application/json"}));
            fd.append("file", cloneVideo, cloneVideo.name);
            return fd;
          })(),
        }
      );
      const uploadData = await uploadRes.json();
      const fileUri    = uploadData?.file?.uri;
      const mimeType   = uploadData?.file?.mimeType || cloneVideo.type || "video/mp4";
      if (!fileUri) throw new Error("Upload falhou: " + JSON.stringify(uploadData));

      setCloneProgress("⏳ Processando vídeo no Gemini...");
      const fileName = uploadData.file.name;
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(r=>setTimeout(r, 2000));
        const st = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${KEY}`);
        const sd = await st.json();
        if (sd.state === "ACTIVE") break;
        if (sd.state === "FAILED") throw new Error("Processamento do vídeo falhou no Gemini.");
        attempts++;
      }

      setCloneProgress("🔬 Analisando movimento com Gemini 2.0 Flash...");
      const analyzeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
        {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            system_instruction:{ parts:[{text: UGC_SYSTEM}] },
            contents:[{ parts:[
              { file_data:{ mime_type:mimeType, file_uri:fileUri } },
              { text:`Analyze this UGC product video and generate the motion prompt.${cloneProd?`\nProduct being held: ${cloneProd}`:""}`}
            ]}],
            generation_config:{ max_output_tokens:2000, temperature:0.4 },
          }),
        }
      );
      const ad  = await analyzeRes.json();
      const raw = ad?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
      if (!raw) throw new Error("Gemini não retornou resultado: " + JSON.stringify(ad));
      setCloneRes(parseCloneResult(raw));
      setCloneProgress("");
      setAba("ugcclone");
    } catch(e) { setErro(e.message); setCloneProgress(""); }
    setLoading(false);
  };

  const gerarClone = () => {
    if (cloneMode==="descricao") return gerarCloneDesc();
    if (cloneMode==="frames")    return gerarCloneFrames();
    if (cloneMode==="gemini")    return gerarCloneGemini();
  };

  return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:fontSans, color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;}
        input:focus,textarea:focus,select:focus{border-color:${C.gold}!important;box-shadow:0 0 0 3px rgba(255,215,0,.1);}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px;}
        input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;background:rgba(255,255,255,.1);outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${C.gold};cursor:pointer;}
        select option{background:#1a1a2e;color:#f0ede8;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        .hov-gold:hover{border-color:rgba(255,215,0,.4)!important;}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(180deg,#0f0805,${C.bg})`, borderBottom:`1px solid ${C.border}`, padding:"18px 20px"}}>
        <div style={{maxWidth:1100, margin:"0 auto"}}>
          <div style={{fontSize:9, letterSpacing:5, color:C.gold, marginBottom:5, fontWeight:700, fontFamily:font}}>
            🔥 ULTIMATE SUPREME · CLAUDE NATIVE · ZERO CONFIG
          </div>
          <h1 style={{fontSize:26, fontWeight:900, margin:"0 0 4px", background:`linear-gradient(135deg,${C.gold},${C.pink})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>
            TikTok Shop Generator ULTIMATE SUPREME
          </h1>
          <p style={{fontSize:11, color:C.dim, margin:0, fontFamily:font}}>
            FastMoss BR · Agent Finder · Hooks · Roteiros 5F · Coringa · Meta Ads · Legendas · Veo 3 · CBO · Shield · Monetização
          </p>
          <div style={{marginTop:10, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>

            {/* STATUS DA API */}
            <div onClick={apiStatus!=="testing"?testarAI:undefined} style={{
              display:"inline-flex", alignItems:"center", gap:8, borderRadius:20, padding:"5px 14px", fontSize:11, fontFamily:font,
              cursor:apiStatus!=="testing"?"pointer":"default",
              background: apiStatus==="ok"?C.greend : apiStatus==="error"?"#ff000018" : "#ffffff08",
              border:`1px solid ${apiStatus==="ok"?C.green+"30" : apiStatus==="error"?"#ff000040":"#ffffff15"}`,
              color: apiStatus==="ok"?C.green : apiStatus==="error"?"#f87171" : C.dim,
              transition:"all .3s"
            }}>
              <div style={{
                width:6, height:6, borderRadius:"50%", flexShrink:0,
                background: apiStatus==="ok"?C.green : apiStatus==="error"?"#f87171":"#666",
                animation: apiStatus==="testing"?"pulse 1s infinite":apiStatus==="ok"?"pulse 2s infinite":"none",
              }}/>
              {apiStatus==="idle"    && `${PROVIDERS_CFG[activeProvider]?.name} · Configure a key`}
              {apiStatus==="testing" && `⟳ Testando ${PROVIDERS_CFG[activeProvider]?.name}...`}
              {apiStatus==="ok"      && `${PROVIDERS_CFG[activeProvider]?.name} · OK${apiLatency?` · ${apiLatency}ms`:""}`}
              {apiStatus==="error"   && `${PROVIDERS_CFG[activeProvider]?.name} · Erro — clique para testar`}
            </div>

            <button onClick={()=>setShowKeyModal(true)} style={{
              display:"inline-flex", alignItems:"center", gap:6, borderRadius:20, padding:"5px 14px", fontSize:11, fontFamily:font,
              background: getKey(activeProvider) ? "#ffd70018" : "#ff000018",
              border:`1px solid ${getKey(activeProvider)?"#ffd70040":"#ff000060"}`,
              color: getKey(activeProvider) ? C.gold : "#f87171",
              cursor:"pointer"
            }}>
              ⚙️ {getKey(activeProvider) ? "Configurado" : "Configurar API"}
            </button>

            {geminiStatus!=="idle"&&(
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6, borderRadius:20, padding:"5px 14px", fontSize:11, fontFamily:font,
                background: geminiStatus==="ok"?"#4ade8018":"#ff000018",
                border:`1px solid ${geminiStatus==="ok"?"#4ade8030":"#ff000040"}`,
                color: geminiStatus==="ok"?"#4ade80":"#f87171",
              }}>
                <div style={{width:6,height:6,borderRadius:"50%",background:geminiStatus==="ok"?"#4ade80":"#f87171"}}/>
                {geminiStatus==="testing"&&"⟳ Gemini Clone..."}
                {geminiStatus==="ok"&&`Gemini Clone · OK${geminiLatency?` · ${geminiLatency}ms`:""}`}
                {geminiStatus==="error"&&"Gemini Clone · Key inválida"}
              </div>
            )}
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}`}</style>
        </div>
      </div>

      {/* ── MODAL CONFIGURAR API ── */}
      {showKeyModal&&(
        <div onClick={()=>setShowKeyModal(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0d0d12", border:`1px solid ${C.border}`, borderRadius:20,
            padding:28, width:"100%", maxWidth:520, animation:"fadeUp .2s ease"
          }}>
            <div style={{fontSize:9, color:C.gold, letterSpacing:3, marginBottom:12, fontFamily:font}}>⚙️ CONFIGURAR API</div>
            <div style={{fontSize:20, fontWeight:800, marginBottom:20}}>Escolha o Provider</div>

            <div style={{display:"grid", gap:8, marginBottom:20}}>
              {Object.entries(PROVIDERS_CFG).map(([id, p])=>(
                <div key={id} onClick={()=>changeProvider(id)} style={{
                  background: activeProvider===id?C.goldd:C.card,
                  border:`2px solid ${activeProvider===id?C.gold:C.border}`,
                  borderRadius:12, padding:"14px 16px", cursor:"pointer", transition:"all .15s"
                }}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:14, fontWeight:700, color:activeProvider===id?C.gold:C.text}}>{p.name}</div>
                      <div style={{fontSize:11, color:C.dim, marginTop:3, fontFamily:font}}>{p.sub}</div>
                    </div>
                    <div style={{display:"flex", gap:6, alignItems:"center"}}>
                      {p.free&&<span style={{fontSize:9, color:C.green, background:C.greend, padding:"2px 8px", borderRadius:20, fontFamily:font}}>GRÁTIS</span>}
                      {activeProvider===id&&<div style={{width:8,height:8,borderRadius:"50%",background:C.gold}}/>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:8, fontFamily:font}}>
              API KEY — {PROVIDERS_CFG[activeProvider]?.name}
            </div>
            <div style={{display:"flex", gap:8, marginBottom:8}}>
              <input
                type={showKeyInput?"text":"password"}
                style={{flex:1, background:C.card2, border:`1px solid ${keys[activeProvider]?C.gold:C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:13, fontFamily:font, outline:"none"}}
                placeholder={`Cole sua key aqui...`}
                value={keys[activeProvider]||""}
                onChange={e=>updateKey(activeProvider, e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") salvarKey(activeProvider, keys[activeProvider]||""); }}
              />
              <button onClick={()=>setShowKeyInput(v=>!v)} style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"0 14px", color:C.mid, cursor:"pointer", fontSize:16}}>
                {showKeyInput?"🙈":"👁️"}
              </button>
            </div>
            <div style={{fontSize:10, color:C.dim, marginBottom:16, fontFamily:font}}>
              🔒 Salva no seu browser · Pegar key:{" "}
              <a href={PROVIDERS_CFG[activeProvider]?.keyUrl} target="_blank" rel="noreferrer" style={{color:C.gold}}>
                {PROVIDERS_CFG[activeProvider]?.keyUrl?.replace("https://","")}
              </a>
            </div>

            {apiError&&<div style={{fontSize:11, color:"#f87171", background:"#ff000010", border:"1px solid #ff000030", borderRadius:8, padding:"8px 12px", marginBottom:12, fontFamily:font}}>❌ {apiError}</div>}

            <div style={{display:"flex", gap:10}}>
              <button onClick={()=>salvarKey(activeProvider, keys[activeProvider]||"")} style={{
                flex:1, background:C.gold, border:"none", borderRadius:10, padding:"13px",
                color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:font
              }}>✅ Salvar e Testar</button>
              <button onClick={()=>setShowKeyModal(false)} style={{
                background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 18px",
                color:C.dim, fontSize:12, cursor:"pointer"
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      <div style={{borderBottom:`1px solid ${C.border}`, background:C.card, position:"sticky", top:0, zIndex:100}}>
        <div style={{maxWidth:1100, margin:"0 auto", display:"flex", overflowX:"auto", padding:"0 16px"}}>
          {ABAS.map(a=>(
            <button key={a.id} onClick={()=>setAba(a.id)} style={{
              background:"none", border:"none", borderBottom:`2px solid ${aba===a.id?a.cor:"transparent"}`,
              padding:"11px 13px", cursor:"pointer", fontFamily:fontSans,
              color:aba===a.id?a.cor:C.dim, fontSize:11, fontWeight:aba===a.id?700:400,
              whiteSpace:"nowrap", transition:"all .2s"
            }}>{a.label}</button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100, margin:"0 auto", padding:"24px 18px"}}>

        {/* ══════════════════ FASTMOSS ══════════════════ */}
        {aba==="fastmoss" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.green}>🔍 PRODUCT FINDER — FASTMOSS & KALODATA</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>Cole qualquer página e veja os melhores produtos</div>
            <div style={{fontSize:12, color:C.dim, marginBottom:16, fontFamily:font}}>Funciona com FastMoss, Kalodata ou qualquer lista copiada</div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16}}>
              <div style={{fontSize:11, color:C.gold, letterSpacing:2, marginBottom:8, fontFamily:font}}>📋 COLE A PÁGINA DO FASTMOSS OU KALODATA</div>
              <div style={{fontSize:11, color:C.dim, marginBottom:12, lineHeight:1.7, fontFamily:font}}>
                1. Abra FastMoss/Kalodata no browser → 2. Ctrl+A e Ctrl+C → 3. Cole aqui e clique em Analisar
              </div>
              <textarea style={inp({minHeight:160, resize:"vertical", fontFamily:font, fontSize:11, marginBottom:12})}
                placeholder="Cole o conteúdo da página aqui..."
                value={finderTxt} onChange={e=>{setFinderTxt(e.target.value);setFinderRes(null);setErro(null);}}
              />
              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                <Btn onClick={analisarFinder} disabled={loading||!finderTxt.trim()} color={C.green}>
                  {loading?"⟳ Analisando...":"🔍 Analisar e Ranquear"}
                </Btn>
                {finderRes&&<Btn onClick={()=>{setFinderTxt("");setFinderRes(null);}} color={C.card2} style={{color:C.mid, border:`1px solid ${C.border}`}}>🗑️ Limpar</Btn>}
              </div>
            </div>

            {finderRes?.produtos && (
              <div style={{animation:"fadeUp .3s ease"}}>
                <div style={{background:C.card, border:`1px solid ${C.green}30`, borderRadius:12, padding:16, marginBottom:16}}>
                  <div style={{fontSize:9, color:C.green, letterSpacing:2, marginBottom:10, fontFamily:font}}>📊 RESUMO</div>
                  <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:10}}>
                    {[["Analisados",finderRes.resumo?.total||finderRes.produtos.length,""],["🏆 Ouro",finderRes.resumo?.ouro||0,C.gold],["🔥 Cavalo",finderRes.resumo?.cavalo||0,C.orange],["💥 Foguete",finderRes.resumo?.foguete||0,C.pink],["✅ Viável",finderRes.resumo?.viavel||0,C.green]].map(([k,v,cor])=>(
                      <div key={k} style={{background:C.card2, borderRadius:8, padding:"10px 12px"}}>
                        <div style={{fontSize:10, color:C.dim, fontFamily:font}}>{k}</div>
                        <div style={{fontSize:20, fontWeight:700, color:cor||C.text}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {finderRes.top3?.length>0&&(
                  <div style={{background:C.goldd, border:`2px solid ${C.gold}40`, borderRadius:12, padding:16, marginBottom:16}}>
                    <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:10, fontFamily:font}}>🏆 TOP 3 PRIORIDADES</div>
                    {finderRes.top3.map((t,i)=>(
                      <div key={i} style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", marginBottom:i<2?8:0, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                        <div><span style={{fontSize:18, fontWeight:700, color:C.gold}}>#{t.posicao}</span><span style={{fontSize:13, fontWeight:600, marginLeft:10}}>{t.nome}</span></div>
                        <span style={{fontSize:11, color:C.green, background:C.greend, padding:"3px 10px", borderRadius:6, fontFamily:font}}>{t.score}/100</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{fontSize:9, color:C.dim, letterSpacing:2, marginBottom:12, fontFamily:font}}>{finderRes.produtos.length} PRODUTOS RANQUEADOS</div>
                {finderRes.produtos.map((p,i)=>{
                  const cor = p.score>=90?C.gold:p.score>=75?C.orange:p.score>=60?C.pink:C.green;
                  return (
                    <div key={i} style={{background:C.card, border:`2px solid ${cor}40`, borderRadius:14, padding:18, marginBottom:14}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14, fontWeight:700, marginBottom:4}}>{p.classificacao} {p.nome}</div>
                          <div style={{fontSize:11, color:C.dim, fontFamily:font}}>{p.categoria}</div>
                        </div>
                        <div style={{fontSize:32, fontWeight:900, color:cor, flexShrink:0, fontFamily:font}}>{p.score}</div>
                      </div>
                      <ScoreBar score={p.score}/>
                      <div style={{fontSize:11, color:C.green, marginBottom:12, fontStyle:"italic"}}>💡 {p.por_que}</div>
                      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:8, marginBottom:12}}>
                        {[["Preço",p.valor],["Comissão/venda",p.comissao_por_venda],["Crescimento",p.crescimento],["Vendas 7d",p.vendas7d]].map(([k,v])=>(
                          v&&<div key={k} style={{background:C.card2, borderRadius:7, padding:"8px 10px"}}>
                            <div style={{fontSize:9, color:C.dim, fontFamily:font}}>{k}</div>
                            <div style={{fontSize:12, fontWeight:600}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {p.path_10k&&<div style={{background:C.goldd, border:`1px solid ${C.gold}30`, borderRadius:8, padding:"8px 12px", marginBottom:10}}>
                        <div style={{fontSize:9, color:C.gold, letterSpacing:1, marginBottom:3, fontFamily:font}}>💰 PATH R$10K</div>
                        <div style={{fontSize:12, fontWeight:600}}>{p.path_10k}</div>
                      </div>}
                      {p.angulos?.length>0&&(
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:9, color:C.dim, letterSpacing:1, marginBottom:5, fontFamily:font}}>💡 ÂNGULOS</div>
                          {p.angulos.map((a,j)=><div key={j} style={{fontSize:11, color:C.text, marginBottom:3}}>• {a}</div>)}
                        </div>
                      )}
                      <Btn onClick={()=>{
                        setForm2({nome:p.nome, valor:String(p.valor||"").replace("R$","").replace(",","."), categoria:p.categoria||"Beleza e cuidados pessoais", descricao:p.descricao||`Produto de ${p.categoria}. Crescimento: ${p.crescimento}. Vendas 7d: ${p.vendas7d}.`});
                        setAba("produto");
                      }} color={C.green} style={{width:"100%"}}>🚀 Usar este produto</Btn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ PRODUTO ══════════════════ */}
        {aba==="produto" && (
          <div style={{maxWidth:720, margin:"0 auto", animation:"fadeUp .3s ease"}}>
            <Badge>📦 PRODUTO</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>Configure o Produto</div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:22, marginBottom:16}}>
              <div style={{display:"grid", gap:12}}>
                <input style={inp()} placeholder="Nome do produto *" value={form.nome} onChange={e=>setForm2({nome:e.target.value})}/>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                  <input style={inp()} placeholder="Valor (ex: 49.90) *" value={form.valor} onChange={e=>setForm2({valor:e.target.value})}/>
                  <select style={inp()} value={form.categoria} onChange={e=>setForm2({categoria:e.target.value})}>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <textarea style={inp({minHeight:80, resize:"vertical"})} placeholder="Descrição e benefícios *" value={form.descricao} onChange={e=>setForm2({descricao:e.target.value})}/>
                <textarea style={inp({minHeight:70, resize:"vertical", background:"#150a15", border:`2px solid ${form.copyViral?C.pink:C.border}`})}
                  placeholder="📺 COPY VIRAL (opcional) — cole um script que viralizou para modelar"
                  value={form.copyViral} onChange={e=>setForm2({copyViral:e.target.value})}/>

                <div style={{background:"#03111a", border:`2px solid ${form.seoKeyword?"#38bdf8":C.border}`, borderRadius:10, padding:"4px 4px 4px 14px", display:"flex", alignItems:"center", gap:10}}>
                  <div style={{flexShrink:0}}>
                    <div style={{fontSize:16}}>🔍</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8, color:"#38bdf8", letterSpacing:3, fontFamily:font, fontWeight:700, marginBottom:3, paddingTop:6}}>
                      SEO · TIKTOK CREATOR SEARCH INSIGHTS
                    </div>
                    <input
                      style={{...inp({background:"transparent", border:"none", padding:"0 0 8px 0", fontSize:13, color:C.text}), outline:"none"}}
                      placeholder="Ex: sérum vitamina c, proteína whey, organizador de gaveta..."
                      value={form.seoKeyword}
                      onChange={e=>setForm2({seoKeyword:e.target.value})}
                    />
                  </div>
                  {form.seoKeyword&&(
                    <div style={{flexShrink:0, paddingRight:10}}>
                      <span style={{fontSize:9, color:"#38bdf8", background:"#38bdf818", border:"1px solid #38bdf830", borderRadius:20, padding:"3px 10px", fontFamily:font, fontWeight:700}}>ATIVO</span>
                    </div>
                  )}
                </div>
                {form.seoKeyword&&(
                  <div style={{background:"#38bdf808", border:"1px solid #38bdf820", borderRadius:8, padding:"8px 12px", display:"flex", gap:10, alignItems:"flex-start"}}>
                    <span style={{fontSize:13, flexShrink:0}}>💡</span>
                    <div style={{fontSize:11, color:"#7dd3fc", lineHeight:1.6, fontFamily:font}}>
                      A palavra <strong style={{color:"#38bdf8"}}>"{form.seoKeyword}"</strong> será injetada no <strong style={{color:"#38bdf8"}}>hook</strong>, na <strong style={{color:"#38bdf8"}}>fala</strong> e na <strong style={{color:"#38bdf8"}}>legenda</strong> de todos os conteúdos gerados — exatamente como o TikTok Search Insights recomenda.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:C.teal, letterSpacing:2, marginBottom:12, fontFamily:font}}>🎯 NICHO (para Legendas)</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8}}>
                {NICHOS.map(n=>(
                  <div key={n.id} onClick={()=>setNichoSel(n.id)} className="hov-gold" style={{
                    background:nichoSel===n.id?C.teald:C.card2,
                    border:`1px solid ${nichoSel===n.id?C.teal:C.border}`,
                    borderRadius:10, padding:"10px 8px", textAlign:"center", cursor:"pointer", transition:"all .15s"
                  }}>
                    <div style={{fontSize:18, marginBottom:4}}>{n.emoji}</div>
                    <div style={{fontSize:10, color:nichoSel===n.id?C.teal:C.mid, fontWeight:500}}>{n.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:10, fontFamily:font}}>📊 QUANTIDADE: {qtd}</div>
              <input type="range" min={3} max={20} step={1} value={qtd} onChange={e=>setQtd(+e.target.value)} style={{width:"100%", marginBottom:12}}/>
              <div onClick={()=>setBlind(b=>!b)} style={{
                background:blind?C.greend:C.pinkd, border:`1px solid ${blind?C.green:C.pink}`,
                borderRadius:10, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12
              }}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12, fontWeight:700, color:blind?C.green:C.pink}}>
                    {blind?"🛡️ BLINDADOR ULTRA ATIVADO":"⚠️ BLINDADOR DESATIVADO"}
                  </div>
                  <div style={{fontSize:10, color:C.mid, marginTop:2, fontFamily:font}}>
                    {blind?"Proteção contra violações TikTok Shop":"Sem proteção — usar com cuidado"}
                  </div>
                </div>
                <div style={{width:44, height:24, background:blind?C.green:C.card2, borderRadius:20, position:"relative", transition:"all .3s"}}>
                  <div style={{width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute", top:3, left:blind?23:3, transition:"all .3s"}}/>
                </div>
              </div>
            </div>

            {s.hooks?.pov_hooks?.length>0&&(
              <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:18, marginBottom:16}}>
                <div style={{fontSize:9, color:C.purple, letterSpacing:2, marginBottom:10, fontFamily:font}}>⚡ HOOK DE REFERÊNCIA PARA ROTEIROS (opcional)</div>
                <div style={{maxHeight:180, overflowY:"auto", display:"grid", gap:8, marginBottom:10}}>
                  {s.hooks.pov_hooks.slice(0,6).map((h,i)=>(
                    <div key={i} onClick={()=>setHookSelecionado(hookSelecionado===h.hook?"":h.hook)} style={{
                      background:hookSelecionado===h.hook?C.purpled:C.card2,
                      border:`1px solid ${hookSelecionado===h.hook?C.purple:C.border}`,
                      borderRadius:9, padding:"10px 14px", cursor:"pointer", transition:"all .15s"
                    }}>
                      <div style={{fontSize:13, color:C.text, lineHeight:1.5}}>{h.hook}</div>
                      <div style={{fontSize:9, color:C.dim, marginTop:3, fontFamily:font}}>Score {h.score_probabilidade}/100 · {h.padrao_usado}</div>
                    </div>
                  ))}
                </div>
                <input style={inp({fontSize:12})} placeholder="Ou escreva/cole um hook aqui..." value={hookSelecionado} onChange={e=>setHookSelecionado(e.target.value)}/>
              </div>
            )}

            {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}

            <div style={{height:1, background:C.border, marginBottom:16}}/>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:8}}>
              <Btn onClick={()=>gerar("agent")}    disabled={loading} color={C.green}>🎯 Agent Finder</Btn>
              <Btn onClick={()=>gerar("hooks")}    disabled={loading}>🎣 POV Hooks ({qtd})</Btn>
              <Btn onClick={()=>gerar("roteiros")} disabled={loading}>🎬 Roteiros ({qtd})</Btn>
              <Btn onClick={()=>gerar("coringa")}  disabled={loading} color={C.pink}>🃏 Coringa ({qtd})</Btn>
              <Btn onClick={()=>gerar("meta")}     disabled={loading} color={C.blue}>💰 Meta Ads ({qtd})</Btn>
              <Btn onClick={()=>gerar("veo3")}     disabled={loading} color={C.purple}>🚀 Veo 3 ({qtd})</Btn>
              <Btn onClick={gerarLegendas}          disabled={loading} color={C.teal}>📝 Legendas ({qtdLegendas})</Btn>
            </div>
            {loading&&<div style={{textAlign:"center", padding:16, color:C.mid, fontSize:13, fontFamily:font}}>⟳ Gerando com Claude Sonnet 4...</div>}
          </div>
        )}

        {/* ══════════════════ AGENT ══════════════════ */}
        {aba==="agent" && (
          <div style={{maxWidth:700, margin:"0 auto", animation:"fadeUp .3s ease"}}>
            <Badge color={C.green}>🎯 AGENT FINDER 2.0</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>Análise de Viabilidade</div>
            {s.agent?.agent ? (
              <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:22}}>
                <div style={{fontSize:56, fontWeight:900, color:s.agent.agent.score>=80?C.green:s.agent.agent.score>=60?C.orange:C.pink, marginBottom:4, fontFamily:font}}>
                  {s.agent.agent.score}<span style={{fontSize:20}}>/100</span>
                </div>
                <ScoreBar score={s.agent.agent.score}/>
                <div style={{fontSize:14, fontWeight:700, color:C.green, marginBottom:16}}>{s.agent.agent.recomendacao}</div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14}}>
                  {[["Demanda",s.agent.agent.demanda],["Concorrência",s.agent.agent.concorrencia],["Ticket Médio",s.agent.agent.ticket_medio],["Comissão",s.agent.agent.comissao_estimada],["Tendência 30d",s.agent.agent.tendencia_30d]].map(([k,v])=>(
                    <div key={k} style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px"}}>
                      <div style={{fontSize:9, color:C.dim, letterSpacing:1, marginBottom:3, fontFamily:font}}>{k}</div>
                      <div style={{fontSize:13, fontWeight:600}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:C.goldd, border:`1px solid ${C.gold}30`, borderRadius:10, padding:12, marginBottom:12}}>
                  <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:4, fontFamily:font}}>💰 PATH R$10K</div>
                  <div style={{fontSize:13, fontWeight:600}}>{s.agent.agent.path_10k}</div>
                </div>
                <div style={{fontSize:9, color:C.mid, letterSpacing:2, marginBottom:8, fontFamily:font}}>💡 ÂNGULOS MATADORES</div>
                {s.agent.agent.angulos_matadores?.map((a,i)=>(
                  <div key={i} style={{fontSize:12, color:C.text, marginBottom:5}}>• {a}</div>
                ))}
              </div>
            ) : <div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → clique em "Agent Finder"</div>}
          </div>
        )}

        {/* ══════════════════ HOOKS ══════════════════ */}
        {aba==="hooks" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge>🎣 POV HOOKS</Badge>
            {form.seoKeyword&&(
              <div style={{display:"inline-flex", alignItems:"center", gap:6, background:"#38bdf818", border:"1px solid #38bdf840", borderRadius:20, padding:"4px 12px", marginBottom:12, marginLeft:8}}>
                <span style={{fontSize:11}}>🔍</span>
                <span style={{fontSize:10, color:"#38bdf8", fontFamily:font, fontWeight:700}}>SEO: "{form.seoKeyword}"</span>
              </div>
            )}
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>{s.hooks?.pov_hooks?.length||0} Hooks Gerados</div>
            {s.hooks?.pov_hooks?.length>0&&(
              <div style={{display:"flex", justifyContent:"flex-end", marginBottom:12}}>
                <Btn onClick={()=>{
                  const all = s.hooks.pov_hooks.map((h,i)=>`${i+1}. ${h.hook}`).join("\n\n");
                  onCopy(all,"hooks_all");
                }} color={C.green} style={{padding:"8px 16px", fontSize:11}}>
                  {copied==="hooks_all"?"✓ Copiados!":"📋 Copiar Todos"}
                </Btn>
              </div>
            )}
            {s.hooks?.pov_hooks?.map((h,i)=>(
              <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.04}s both`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <Badge>HOOK {h.numero}</Badge>
                  <div style={{display:"flex", gap:10, alignItems:"center"}}>
                    <span style={{fontSize:10, color:scoreColor(h.score_probabilidade||0), background:scoreBg(h.score_probabilidade||0), padding:"3px 10px", borderRadius:20, fontFamily:font}}>
                      SCORE {h.score_probabilidade}/100
                    </span>
                    <span style={{fontSize:10, color:C.dim, fontFamily:font}}>CTR {h.ctr_esperado} · {h.palavras}pal</span>
                  </div>
                </div>
                <ScoreBar score={h.score_probabilidade||0}/>
                <div style={{fontSize:14, fontWeight:700, marginBottom:12, color:C.mid, fontFamily:font}}>{h.padrao}</div>
                <CopyBox label="📱 HOOK" content={h.hook} id={`h${i}`} copied={copied} onCopy={onCopy} large/>
                {[["Estrutura",h.estrutura],["Por que funciona",h.por_que_funciona],["Quando usar",h.quando_usar]].map(([k,v])=>(
                  v&&<div key={k} style={{fontSize:11, color:C.mid, marginBottom:5}}>
                    <strong style={{color:C.text}}>{k}:</strong> {v}
                  </div>
                ))}
                <div style={{marginTop:10}}>
                  <button onClick={()=>setHookSelecionado(h.hook)} style={{
                    fontSize:10, fontFamily:font, background:hookSelecionado===h.hook?C.purpled:C.card2,
                    color:hookSelecionado===h.hook?C.purple:C.dim, border:`1px solid ${hookSelecionado===h.hook?C.purple:C.border}`,
                    borderRadius:6, padding:"4px 12px", cursor:"pointer"
                  }}>{hookSelecionado===h.hook?"✓ Selecionado p/ Roteiro":"Usar p/ Roteiro"}</button>
                </div>
              </div>
            ))||<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → "Gerar Hooks"</div>}
          </div>
        )}

        {/* ══════════════════ MILLION ══════════════════ */}
        {aba==="million" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.gold}>💎 HOOK SCIENCE · MILLION DOLLAR SYSTEM</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>12 Padrões Científicos R$1M+</div>
            <div style={{fontSize:12, color:C.dim, marginBottom:16, fontFamily:font}}>Selecione padrões → Configure produto → Gere hooks com score e CTR</div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:16}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                <div style={{fontSize:11, color:C.gold, letterSpacing:2, fontFamily:font}}>{padroesSel.size} PADRÕES SELECIONADOS</div>
                <div style={{display:"flex", gap:8}}>
                  <button onClick={()=>setPadroesSel(new Set(PADROES_MILLION.map(p=>p.id)))} style={{background:C.goldd, border:`1px solid ${C.gold}40`, borderRadius:8, padding:"6px 12px", color:C.gold, fontSize:11, cursor:"pointer", fontFamily:font, fontWeight:700}}>Todos</button>
                  <button onClick={()=>setPadroesSel(new Set())} style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.dim, fontSize:11, cursor:"pointer", fontFamily:font}}>Limpar</button>
                </div>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))", gap:10}}>
                {PADROES_MILLION.map(p=>{
                  const sel = padroesSel.has(p.id);
                  return (
                    <div key={p.id} onClick={()=>{const n=new Set(padroesSel);n.has(p.id)?n.delete(p.id):n.add(p.id);setPadroesSel(n);}} style={{
                      background:sel?C.goldd:C.card2, border:`2px solid ${sel?C.gold:C.border}`,
                      borderRadius:11, padding:14, cursor:"pointer", transition:"all .2s"
                    }}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                        <div style={{fontSize:22}}>{p.emoji}</div>
                        <div style={{fontSize:9, background:C.greend, color:C.green, padding:"3px 9px", borderRadius:20, fontWeight:700, fontFamily:font}}>{p.ctr}</div>
                      </div>
                      <div style={{fontSize:13, fontWeight:700, marginBottom:5}}>{p.nome}</div>
                      <div style={{fontSize:10, color:C.mid, fontFamily:font, marginBottom:5}}>{p.formula}</div>
                      <div style={{fontSize:9, color:C.dim, lineHeight:1.4, fontFamily:font}}>{p.quando}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:12, fontFamily:font}}>📦 PRODUTO (ou use o configurado em 📦 Produto)</div>
              <div style={{display:"grid", gap:10, marginBottom:14}}>
                <input style={inp()} placeholder="Nome do produto" value={form.nome} onChange={e=>setForm2({nome:e.target.value})}/>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                  <input style={inp()} placeholder="Valor (ex: 49.90)" value={form.valor} onChange={e=>setForm2({valor:e.target.value})}/>
                  <select style={inp()} value={form.categoria} onChange={e=>setForm2({categoria:e.target.value})}>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <textarea style={inp({minHeight:70, resize:"vertical"})} placeholder="Descrição e benefícios" value={form.descricao} onChange={e=>setForm2({descricao:e.target.value})}/>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:14}}>
                <span style={{fontSize:11, color:C.mid, fontFamily:font}}>Quantidade:</span>
                <input type="range" min={3} max={20} step={1} value={qtd} onChange={e=>setQtd(+e.target.value)} style={{flex:1}}/>
                <span style={{fontSize:22, fontWeight:900, color:C.gold, minWidth:40, fontFamily:font}}>{qtd}</span>
              </div>
              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              <Btn onClick={gerarMillion} disabled={loading||padroesSel.size===0} color={C.gold} style={{width:"100%", fontSize:14, padding:"14px"}}>
                {loading?"⟳ Gerando hooks científicos...":`💎 Gerar ${qtd} Hooks Milionários`}
              </Btn>
            </div>

            {s.million?.hooks?.length>0&&(
              <div style={{animation:"fadeUp .3s ease"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
                  <div><div style={{fontSize:9, color:C.gold, letterSpacing:3, marginBottom:4, fontFamily:font}}>RESULTADOS</div>
                  <div style={{fontSize:20, fontWeight:900}}>{s.million.hooks.length} Hooks</div></div>
                  <Btn onClick={()=>onCopy(s.million.hooks.map((h,i)=>`${i+1}. ${h.hook}`).join("\n\n"),"mill_all")} color={C.green} style={{padding:"9px 16px", fontSize:11}}>
                    {copied==="mill_all"?"✓ Copiados!":"📋 Copiar Todos"}
                  </Btn>
                </div>
                {s.million.hooks.map((h,i)=>{
                  const sc = h.score_probabilidade||0;
                  return (
                    <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.04}s both`}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                        <span style={{fontSize:10, background:scoreBg(sc), color:scoreColor(sc), padding:"5px 13px", borderRadius:20, fontWeight:700, fontFamily:font}}>SCORE {sc}/100</span>
                        <span style={{fontSize:10, color:C.dim, fontFamily:font}}>CTR: {h.ctr_esperado} · {h.palavras}pal</span>
                      </div>
                      <ScoreBar score={sc}/>
                      <CopyBox label="📱 HOOK" content={h.hook} id={`mill${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                      <div style={{display:"grid", gap:8}}>
                        {[["PADRÃO",h.padrao_usado,C.gold],["FÓRMULA",h.formula_aplicada,C.gold],["POR QUE FUNCIONA",h.por_que_funciona,C.text]].map(([k,v,c])=>(
                          v&&<div key={k}>
                            <div style={{fontSize:9, color:C.gold, letterSpacing:2, marginBottom:3, fontFamily:font}}>{k}</div>
                            <div style={{fontSize:12, color:C.mid, fontFamily:k==="FÓRMULA"?font:fontSans}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ ROTEIROS ══════════════════ */}
        {aba==="roteiros" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge>🎬 VILLAIN VS HERO · 5 FASES</Badge>
            {form.seoKeyword&&(
              <div style={{display:"inline-flex", alignItems:"center", gap:6, background:"#38bdf818", border:"1px solid #38bdf840", borderRadius:20, padding:"4px 12px", marginBottom:12, marginLeft:8}}>
                <span style={{fontSize:11}}>🔍</span>
                <span style={{fontSize:10, color:"#38bdf8", fontFamily:font, fontWeight:700}}>SEO: "{form.seoKeyword}"</span>
              </div>
            )}
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>{s.roteiros?.roteiros?.length||0} Roteiros</div>
            {s.roteiros?.roteiros?.map((r,i)=>{
              const narration = r.roteiro_narrado || SCRIPT_PHASES.map(p=>r[p.key]?.fala||"").filter(Boolean).join(" ");
              const pal = narration.split(" ").filter(Boolean).length;
              return (
                <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.06}s both`}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                    <div>
                      <Badge>ROTEIRO {r.numero}</Badge>
                      {r.titulo&&<div style={{fontSize:13, fontWeight:600, color:C.mid, marginTop:2}}>{r.titulo}</div>}
                    </div>
                    <div style={{display:"flex", gap:8, alignItems:"center"}}>
                      <span style={{fontSize:10, color:C.gold, background:C.goldd, padding:"3px 10px", borderRadius:20, border:`1px solid ${C.gold}30`, fontFamily:font}}>{r.duracao}</span>
                      <span style={{fontSize:10, background:pal<=35?C.greend:C.pinkd, color:pal<=35?C.green:C.pink, padding:"3px 10px", borderRadius:20, fontFamily:font}}>{pal} pal {pal<=35?"✓":"⚠"}</span>
                    </div>
                  </div>

                  <CopyBox label="📱 POV HOOK" content={r.pov_hook} id={`rp${i}`} copied={copied} onCopy={onCopy} large/>

                  {SCRIPT_PHASES.some(p=>r[p.key]?.fala)&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:9, color:C.purple, letterSpacing:2, marginBottom:8, fontFamily:font}}>🎙 5 FASES DO ROTEIRO</div>
                      {SCRIPT_PHASES.map(p=>(
                        r[p.key]?.fala&&(
                          <div key={p.key} style={{display:"flex", gap:10, marginBottom:8, alignItems:"flex-start"}}>
                            <div style={{flexShrink:0, background:p.cor+"18", border:`1px solid ${p.cor}40`, borderRadius:8, padding:"6px 10px", minWidth:90, textAlign:"center"}}>
                              <div style={{fontSize:14}}>{p.emoji}</div>
                              <div style={{fontSize:8, color:p.cor, fontFamily:font, fontWeight:700}}>{p.label}</div>
                              <div style={{fontSize:8, color:C.dim, fontFamily:font}}>{p.dur}</div>
                            </div>
                            <div onClick={()=>onCopy(r[p.key].fala,`rf${i}${p.key}`)} style={{
                              flex:1, background:p.cor+"08", border:`1px solid ${copied===`rf${i}${p.key}`?C.green:p.cor+"30"}`,
                              borderRadius:8, padding:"10px 12px", cursor:"pointer", transition:"all .15s"
                            }}>
                              <div style={{fontSize:13, lineHeight:1.6}}>{r[p.key].fala}</div>
                              <div style={{fontSize:9, color:copied===`rf${i}${p.key}`?C.green:C.dim, marginTop:4, fontFamily:font}}>
                                {copied===`rf${i}${p.key}`?"✓ copiado!":"clique para copiar"}
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  <CopyBox label={`🎙️ NARRAÇÃO COMPLETA · ${pal} PALAVRAS`} content={narration} id={`rn${i}`} copied={copied} onCopy={onCopy} color={C.green}/>

                  {(r.villain||r.hero||r.proof)&&(
                    <div style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 12px", marginBottom:9}}>
                      {[["👿 Villain",r.villain,C.orange],["🦸 Hero",r.hero,C.green],["✓ Proof",r.proof,C.blue]].map(([l,v,c])=>(
                        v&&<div key={l} style={{fontSize:11, marginBottom:5}}><strong style={{color:c}}>{l}:</strong> <span style={{color:C.mid}}>{v}</span></div>
                      ))}
                    </div>
                  )}

                  <CopyBox label="📋 LEGENDA SEO" content={r.legenda_seo} id={`rl${i}`} copied={copied} onCopy={onCopy} color={C.orange}/>
                  <CopyBox label="# HASHTAGS (5)" content={r.hashtags?.join(" ")} id={`rh${i}`} copied={copied} onCopy={onCopy} color={C.blue}/>
                </div>
              );
            })||<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → "Gerar Roteiros"</div>}
          </div>
        )}

        {/* ══════════════════ CORINGA ══════════════════ */}
        {aba==="coringa" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.pink}>🃏 FORMATO CORINGA</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:6}}>{s.coringa?.formato_coringa?.length||0} Variações</div>
            <div style={{fontSize:11, color:C.dim, marginBottom:16, fontFamily:font}}>Base: vídeos 214k, 84k, 70k, 11k views. Negativas + produto original + preço + CTA urgente.</div>
            {s.coringa?.formato_coringa?.map((c,i)=>(
              <div key={i} style={{background:C.card, border:`1px solid ${C.pink}30`, borderRadius:14, padding:18, marginBottom:12, animation:`fadeUp .3s ease ${i*.05}s both`}}>
                <Badge color={C.pink}>VARIAÇÃO {c.numero}</Badge>
                <CopyBox label="🃏 ROTEIRO" content={c.roteiro} id={`co${i}`} copied={copied} onCopy={onCopy} color={C.pink}/>
                {c.estrutura&&<div style={{fontSize:10, color:C.mid, marginBottom:4}}><strong style={{color:C.text}}>Estrutura:</strong> {c.estrutura}</div>}
                {c.quando_usar&&<div style={{fontSize:10, color:C.mid}}><strong style={{color:C.text}}>Quando usar:</strong> {c.quando_usar}</div>}
              </div>
            ))||<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → "Gerar Coringa"</div>}
          </div>
        )}

        {/* ══════════════════ META ADS ══════════════════ */}
        {aba==="meta" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.blue}>💰 META ADS ENGINE</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>{s.meta?.meta_hooks?.length||0} Hooks Meta</div>
            {s.meta?.meta_hooks?.map((h,i)=>(
              <div key={i} style={{background:C.card, border:`1px solid ${C.blue}30`, borderRadius:14, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.05}s both`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                  <Badge color={C.blue}>HOOK {h.numero} · {h.padrao}</Badge>
                  <span style={{fontSize:10, color:h.nivel_conversao==="ALTO"?C.orange:C.green, background:C.card2, padding:"3px 10px", borderRadius:20, fontFamily:font}}>🔥 {h.nivel_conversao}</span>
                </div>
                <CopyBox label="🎯 HOOK" content={h.hook} id={`mh${i}`} copied={copied} onCopy={onCopy} color={C.blue} large/>
                <CopyBox label="📝 SCRIPT COMPLETO" content={h.script_completo} id={`ms${i}`} copied={copied} onCopy={onCopy} color={C.green}/>
                {h.por_que_converte&&<div style={{fontSize:11, color:C.mid}}><strong style={{color:C.text}}>Por que converte:</strong> {h.por_que_converte}</div>}
              </div>
            ))||<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → "Meta Ads"</div>}
          </div>
        )}

        {/* ══════════════════ LEGENDAS ══════════════════ */}
        {aba==="legendas" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.teal}>📝 LEGENDAS + HASHTAGS</Badge>
            {form.seoKeyword&&(
              <div style={{display:"inline-flex", alignItems:"center", gap:6, background:"#38bdf818", border:"1px solid #38bdf840", borderRadius:20, padding:"4px 12px", marginBottom:12, marginLeft:8}}>
                <span style={{fontSize:11}}>🔍</span>
                <span style={{fontSize:10, color:"#38bdf8", fontFamily:font, fontWeight:700}}>SEO: "{form.seoKeyword}"</span>
              </div>
            )}
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>{s.legendas?.legendas?.length||0} Variações de Legenda</div>
            <div style={{fontSize:12, color:C.dim, marginBottom:16, fontFamily:font}}>Nicho: {nicho.emoji} {nicho.label} · Configure em 📦 Produto</div>

            <div style={{background:C.card, border:`1px solid ${C.teal}30`, borderRadius:14, padding:18, marginBottom:20}}>
              <div style={{fontSize:9, color:C.teal, letterSpacing:2, marginBottom:12, fontFamily:font}}>⚙️ GERAR LEGENDAS</div>
              <div style={{display:"grid", gap:10, marginBottom:12}}>
                <input style={inp()} placeholder="Nome do produto *" value={form.nome} onChange={e=>setForm2({nome:e.target.value})}/>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                  <input style={inp()} placeholder="Valor (ex: 49.90)" value={form.valor} onChange={e=>setForm2({valor:e.target.value})}/>
                  <input style={inp()} placeholder="Descrição breve" value={form.descricao} onChange={e=>setForm2({descricao:e.target.value})}/>
                </div>
                <input style={{...inp(), background:"#03111a", border:`1px solid ${form.seoKeyword?"#38bdf8":C.border}`}}
                  placeholder="🔍 Palavra-chave SEO (opcional)"
                  value={form.seoKeyword} onChange={e=>setForm2({seoKeyword:e.target.value})}
                />
              </div>
              <div style={{fontSize:9, color:C.teal, letterSpacing:2, marginBottom:8, fontFamily:font}}>NICHO</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:6, marginBottom:12}}>
                {NICHOS.map(n=>(
                  <div key={n.id} onClick={()=>setNichoSel(n.id)} style={{
                    background:nichoSel===n.id?C.teald:C.card2,
                    border:`1px solid ${nichoSel===n.id?C.teal:C.border}`,
                    borderRadius:8, padding:"8px 6px", textAlign:"center", cursor:"pointer", transition:"all .15s"
                  }}>
                    <div style={{fontSize:16}}>{n.emoji}</div>
                    <div style={{fontSize:9, color:nichoSel===n.id?C.teal:C.mid}}>{n.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:12}}>
                <span style={{fontSize:11, color:C.mid, fontFamily:font}}>Variações:</span>
                <input type="range" min={1} max={6} step={1} value={qtdLegendas} onChange={e=>setQtdLegendas(+e.target.value)} style={{flex:1}}/>
                <span style={{fontSize:22, fontWeight:900, color:C.teal, minWidth:30, fontFamily:font}}>{qtdLegendas}</span>
              </div>
              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              <Btn onClick={gerarLegendas} disabled={loading||!form.nome||!form.valor} color={C.teal} style={{width:"100%"}}>
                {loading?"⟳ Gerando legendas...":`📝 Gerar ${qtdLegendas} Legenda${qtdLegendas>1?"s":""} + Hashtags`}
              </Btn>
            </div>

            {s.legendas?.legendas?.map((l,i)=>{
              const textoCompleto = `${l.legenda}\n\n${(l.hashtags||[]).join(" ")}`;
              const isCop = copied===`leg-${i}`;
              return (
                <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:12, animation:`fadeUp .3s ease ${i*.05}s both`}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                    <div style={{fontSize:9, letterSpacing:3, color:C.teal, fontFamily:font}}>VARIAÇÃO {i+1}</div>
                    <div style={{fontSize:10, color:C.teal, background:C.teald, padding:"2px 10px", borderRadius:20, fontFamily:font}}>{l.gancho_tipo}</div>
                  </div>
                  <div onClick={()=>onCopy(textoCompleto,`leg-${i}`)} style={{
                    background:C.teald, border:`1px solid ${isCop?C.green:C.teal+"25"}`,
                    borderRadius:10, padding:"16px 16px 12px", cursor:"pointer", marginBottom:12, transition:"all .15s"
                  }}>
                    <div style={{fontSize:14, lineHeight:1.7, color:C.text, whiteSpace:"pre-line", marginBottom:10}}>{l.legenda}</div>
                    <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:10}}>
                      {(l.hashtags||[]).map((h,hi)=>(
                        <span key={hi} style={{fontSize:12, color:C.teal, fontFamily:font}}>{h}</span>
                      ))}
                    </div>
                    <div style={{fontSize:9, color:isCop?C.green:C.dim, fontFamily:font}}>
                      {isCop?"✓ copiado!":"↗ clique para copiar legenda + hashtags"}
                    </div>
                  </div>
                  <div style={{fontSize:11, color:C.mid, lineHeight:1.6}}>
                    <span style={{color:C.teal, fontFamily:font, fontSize:9, letterSpacing:2}}>POR QUE FUNCIONA  </span>
                    {l.por_que_funciona}
                  </div>
                </div>
              );
            })||(!loading&&<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Gere suas primeiras legendas acima ↑</div>)}
          </div>
        )}

        {/* ══════════════════ VEO 3 ══════════════════ */}
        {aba==="veo3" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div>
                <Badge color={C.purple}>🚀 VEO 3 MODULE</Badge>
                <div style={{fontSize:20, fontWeight:800}}>{s.veo3?.scripts_veo?.length||0} Prompts</div>
              </div>
              {s.veo3?.scripts_veo&&(
                <Btn onClick={()=>{
                  const all = s.veo3.scripts_veo.map(x=>`ugc influencer falando pt brasil\nEmotion/Tone: [${x.tom||"natural"}]\nela diz:\n${x.script}\nPrompt negativo: sem texto, sem legendas, sem palavras na tela, sem elementos gráficos, sem logos, sem distorções, sem mudanças de roupa, sem distorção facial, sem mudanças no fundo, sem movimentos bruscos.`).join("\n\n");
                  onCopy(all,"veo_all");
                }} color={C.green} style={{padding:"8px 14px", fontSize:11}}>
                  {copied==="veo_all"?"✓ Copiados!":"📋 Copiar Todos"}
                </Btn>
              )}
            </div>
            {s.veo3?.scripts_veo?.map((x,i)=>{
              const prompt = `ugc influencer falando pt brasil\nEmotion/Tone: [${x.tom||"natural"}]\nela diz:\n${x.script}\nPrompt negativo: sem texto, sem legendas, sem palavras na tela, sem elementos gráficos, sem logos, sem distorções, sem mudanças de roupa, sem distorção facial, sem mudanças no fundo, sem movimentos bruscos.`;
              return (
                <div key={i} style={{background:C.card, border:`1px solid ${C.purple}30`, borderRadius:14, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.05}s both`}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:12}}>
                    <Badge color={C.purple}>PROMPT {x.numero}</Badge>
                    <div style={{display:"flex", gap:8, alignItems:"center"}}>
                      <span style={{fontSize:10, color:C.orange, fontFamily:font}}>{x.palavras} palavras</span>
                      <span style={{fontSize:10, color:C.purple, background:C.purpled, padding:"2px 10px", borderRadius:20, fontFamily:font}}>{x.tom}</span>
                    </div>
                  </div>
                  <CopyBox label="🎬 PROMPT VEO 3 COMPLETO" content={prompt} id={`veo${i}`} copied={copied} onCopy={onCopy} color={C.purple}/>
                </div>
              );
            })||<div style={{textAlign:"center", padding:40, color:C.dim, fontFamily:font}}>Vá em 📦 Produto → "Gerar Veo 3"</div>}
          </div>
        )}

        {/* ══════════════════ CBO ══════════════════ */}
        {aba==="cbo" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.orange}>📊 CBO ESCALA CIENTÍFICA</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>Multiplica Scripts Vencedores</div>
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20}}>
              <textarea style={inp({minHeight:100, resize:"vertical", marginBottom:12, fontFamily:font})}
                placeholder='Cole o script vencedor aqui... Ex: "não marca não transparece short duplo drift original menos de 30 reais carrinho laranja antes de acabar"'
                value={cboScript} onChange={e=>{setCboScript(e.target.value);setErro(null);}}
              />
              <div style={{display:"flex", gap:8, marginBottom:12}}>
                {[10,20,50].map(n=>(
                  <button key={n} onClick={()=>setCboQtd(n)} style={{
                    background:cboQtd===n?C.oranged:C.card2, border:`1px solid ${cboQtd===n?C.orange+"60":C.border}`,
                    borderRadius:9, padding:"9px 18px", color:cboQtd===n?C.orange:C.dim,
                    fontSize:13, fontWeight:cboQtd===n?700:400, cursor:"pointer", fontFamily:font
                  }}>{n} var.</button>
                ))}
              </div>
              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              <Btn onClick={gerarCBO} disabled={loading||!cboScript.trim()} color={C.orange}>
                {loading?"⟳ Gerando...":`🚀 Gerar ${cboQtd} Variações`}
              </Btn>
            </div>
            {s.cbo?.analise&&(
              <div style={{background:C.oranged, border:`1px solid ${C.orange}30`, borderRadius:10, padding:14, marginBottom:16}}>
                <div style={{fontSize:9, color:C.orange, letterSpacing:2, marginBottom:8, fontFamily:font}}>📊 ANÁLISE DO SCRIPT</div>
                <div style={{fontSize:12, color:C.mid}}><strong style={{color:C.text}}>Padrão:</strong> {s.cbo.analise.padrao}</div>
                <div style={{fontSize:12, color:C.mid, marginTop:4}}><strong style={{color:C.text}}>Estrutura:</strong> {s.cbo.analise.estrutura}</div>
              </div>
            )}
            {s.cbo?.variacoes?.map((v,i)=>{
              const pal=(v.roteiro||"").split(" ").filter(Boolean).length;
              return (
                <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:12, animation:`fadeUp .3s ease ${i*.03}s both`}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                    <Badge color={C.orange}>VAR {v.numero}</Badge>
                    <span style={{fontSize:10, color:C.orange, background:C.oranged, padding:"2px 10px", borderRadius:20, border:`1px solid ${C.orange}30`, fontFamily:font}}>{v.tipo}</span>
                  </div>
                  <CopyBox label="📱 HOOK" content={v.hook} id={`cp${i}`} copied={copied} onCopy={onCopy} color={C.gold} large/>
                  <CopyBox label={`🎙️ ROTEIRO · ${pal} PAL`} content={v.roteiro} id={`cr${i}`} copied={copied} onCopy={onCopy} color={C.green}/>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                    <CopyBox label="📋 LEGENDA" content={v.legenda} id={`cl${i}`} copied={copied} onCopy={onCopy} color={C.orange}/>
                    <CopyBox label="# HASHTAGS" content={v.hashtags?.join(" ")} id={`ch${i}`} copied={copied} onCopy={onCopy} color={C.blue}/>
                  </div>
                  {v.mudanca&&<div style={{fontSize:10, color:C.dim, marginTop:4, fontFamily:font}}>💡 Mudança: {v.mudanca}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════ MONETIZAÇÃO (CORRIGIDA) ══════════════════ */}
        {aba==="monet" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{marginBottom:20}}>
              <Badge color="#e879f9">💎 MONETIZAÇÃO · PROMPT COMPLETO COM AVATAR</Badge>
              <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>Roteiro + Avatar + Regras = Prompt Final</div>
              <div style={{fontSize:12, color:C.dim, fontFamily:font}}>
                Gera o prompt completo no formato: descrição do avatar + regras fixas + roteiro em português
              </div>
            </div>

            {/* PASSO 1: PERSONA */}
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:"#e879f9", letterSpacing:2, marginBottom:12, fontFamily:font}}>
                🎭 PASSO 1: ESCOLHA A PERSONA
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                {[
                  {id:"fazendeiro", label:"🤠 Fazendeiro Rico", desc:"Seduz mulheres 30-55 anos", cor:"#f59e0b", icon:"🤠"},
                  {id:"menina",     label:"🌻 Menina da Roça",   desc:"Seduz homens 35-60 anos",   cor:"#e879f9", icon:"🌻"},
                ].map(p=>(
                  <div key={p.id} onClick={()=>setMonetPersona(p.id)} style={{
                    background:monetPersona===p.id?p.cor+"18":C.card,
                    border:`2px solid ${monetPersona===p.id?p.cor:C.border}`,
                    borderRadius:14, padding:"18px 16px", cursor:"pointer", transition:"all .2s", textAlign:"center"
                  }}>
                    <div style={{fontSize:36, marginBottom:8}}>{p.icon}</div>
                    <div style={{fontSize:14, fontWeight:700, color:monetPersona===p.id?p.cor:C.text, marginBottom:4}}>{p.label}</div>
                    <div style={{fontSize:11, color:C.dim, fontFamily:font, lineHeight:1.5}}>{p.desc}</div>
                    {monetPersona===p.id&&<div style={{marginTop:10, fontSize:10, color:p.cor, fontFamily:font, fontWeight:700, letterSpacing:2}}>✓ SELECIONADO</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* PASSO 2: AVATARES */}
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:"#e879f9", letterSpacing:2, marginBottom:12, fontFamily:font}}>
                🎬 PASSO 2: AVATARES DISPONÍVEIS (sorteio aleatório)
              </div>
              
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:10, marginBottom:14}}>
                {Object.entries(AVATARES).map(([id, avatar]) => (
                  <div key={id} className="hov-gold" style={{
                    background:C.card2, 
                    border:`2px solid ${C.border}`,
                    borderRadius:10, 
                    padding:"12px", 
                    transition:"all .15s"
                  }}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                      <span style={{fontSize:12, fontWeight:600, color:C.text}}>{avatar.nome}</span>
                      <span style={{fontSize:9, color:C.dim, fontFamily:font, background:C.card, padding:"2px 8px", borderRadius:10}}>#{id}</span>
                    </div>
                    <div style={{fontSize:9, color:C.mid, lineHeight:1.4, fontFamily:font}}>
                      {avatar.prompt.slice(0, 100).replace(/\n/g, " ")}...
                    </div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex", gap:8, alignItems:"center", padding:"10px 14px", background:"#e879f908", border:"1px solid #e879f930", borderRadius:8}}>
                <span style={{fontSize:16}}>🎲</span>
                <span style={{fontSize:11, color:"#e879f9", fontFamily:font}}>
                  O avatar será sorteado <strong>aleatoriamente</strong> a cada prompt gerado.
                </span>
              </div>
            </div>

            {/* PASSO 3: CONFIGURAÇÃO */}
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:16}}>
              <div style={{fontSize:9, color:"#e879f9", letterSpacing:2, marginBottom:12, fontFamily:font}}>
                ⚙️ PASSO 3: CONFIGURAÇÃO
              </div>
              
              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:16}}>
                <span style={{fontSize:11, color:C.mid, fontFamily:font}}>Quantidade de prompts:</span>
                <input type="range" min={1} max={20} step={1} value={monetQtd} onChange={e=>setMonetQtd(+e.target.value)} style={{flex:1}}/>
                <span style={{fontSize:28, fontWeight:900, color:"#e879f9", minWidth:36, fontFamily:font}}>{monetQtd}</span>
              </div>

              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              
              <Btn onClick={gerarMonet} disabled={loading} color="#e879f9" style={{width:"100%", fontSize:14, padding:"14px"}}>
                {loading
                  ? `⟳ Gerando ${monetQtd} prompts com avatar aleatório...`
                  : `💎 Gerar ${monetQtd} Prompts Completos · ${monetPersona==="fazendeiro"?"🤠 Fazendeiro":"🌻 Menina da Roça"}`}
              </Btn>
            </div>

            {/* RESULTADOS */}
            {s.monet?.roteiros?.length>0&&(
              <div style={{animation:"fadeUp .3s ease"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
                  <div>
                    <div style={{fontSize:9, color:"#e879f9", letterSpacing:3, marginBottom:4, fontFamily:font}}>
                      PROMPTS COMPLETOS GERADOS
                    </div>
                    <div style={{fontSize:20, fontWeight:900}}>
                      {s.monet.roteiros.length} prompts prontos para copiar e colar
                    </div>
                  </div>
                </div>

                {s.monet.roteiros.map((r, i) => {
                  const palavras = (r.roteiro||"").split(" ").filter(Boolean).length;
                  const ok = palavras <= 40;
                  
                  // Sorteia um avatar diferente para cada prompt
                  const chavesAvatares = Object.keys(AVATARES);
                  const avatarSorteado = AVATARES[chavesAvatares[i % chavesAvatares.length]];
                  
                  // Monta o prompt completo
                  const promptCompleto = `${avatarSorteado.prompt}

He speaks in Brazilian Portuguese:
"${r.roteiro}"

No on-screen text, no subtitles, no captions, no emoji, no transitions. Natural selfie video, realistic lip sync, subtle facial expression, natural blinking, slight head movement, looking directly at camera, realistic smartphone front camera feel, single continuous shot, ultra realistic motion.`;
                  
                  return (
                    <div key={i} style={{
                      background:C.card, 
                      border:`2px solid ${C.border}`, 
                      borderRadius:14, 
                      padding:18, 
                      marginBottom:16, 
                      animation:`fadeUp .3s ease ${i*.04}s both`
                    }}>
                      {/* HEADER */}
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                        <div style={{display:"flex", gap:8, alignItems:"center"}}>
                          <Badge color="#e879f9">PROMPT #{i+1}</Badge>
                          <span style={{
                            fontSize:11, 
                            color:"#f59e0b", 
                            background:"#f59e0b18", 
                            border:"1px solid #f59e0b30", 
                            borderRadius:20, 
                            padding:"3px 10px", 
                            fontFamily:font
                          }}>
                            {r.arquetipo}
                          </span>
                        </div>
                        <div style={{display:"flex", gap:8, alignItems:"center"}}>
                          <span style={{
                            fontSize:10, 
                            background:ok?C.greend:C.pinkd, 
                            color:ok?C.green:C.pink, 
                            padding:"3px 10px", 
                            borderRadius:20, 
                            fontFamily:font
                          }}>
                            {palavras} palavras {ok?"✓":"⚠"}
                          </span>
                          <span style={{fontSize:10, color:C.dim, fontFamily:font, background:C.card2, padding:"3px 10px", borderRadius:20}}>
                            🎬 {avatarSorteado.nome}
                          </span>
                        </div>
                      </div>

                      {/* AVATAR INFO */}
                      <div style={{
                        background:C.card2, 
                        border:`1px solid ${C.border}`, 
                        borderRadius:8, 
                        padding:"8px 12px", 
                        marginBottom:12,
                        display:"flex",
                        gap:8,
                        alignItems:"flex-start"
                      }}>
                        <span style={{fontSize:14, flexShrink:0}}>🎬</span>
                        <div>
                          <div style={{fontSize:10, color:C.gold, fontFamily:font, letterSpacing:1, marginBottom:3}}>
                            AVATAR: {avatarSorteado.nome}
                          </div>
                          <div style={{fontSize:10, color:C.mid, fontFamily:font, lineHeight:1.4}}>
                            {avatarSorteado.prompt.slice(0, 120).replace(/\n/g, " ")}...
                          </div>
                        </div>
                      </div>

                      {/* ROTEIRO */}
                      <div style={{
                        background:"#e879f908", 
                        border:`1px solid #e879f930`,
                        borderRadius:8, 
                        padding:"10px 14px", 
                        marginBottom:12
                      }}>
                        <div style={{fontSize:9, color:"#e879f9", letterSpacing:1, marginBottom:5, fontFamily:font}}>
                          📝 ROTEIRO ({palavras} palavras)
                        </div>
                        <div style={{fontSize:14, fontWeight:600, color:C.text, lineHeight:1.6}}>
                          "{r.roteiro}"
                        </div>
                      </div>

                      {/* CTA */}
                      {r.cta_principal&&(
                        <div style={{
                          background:C.card2, 
                          borderRadius:8, 
                          padding:"8px 12px", 
                          marginBottom:12,
                          display:"flex", 
                          alignItems:"center", 
                          gap:8
                        }}>
                          <span style={{fontSize:11}}>👆</span>
                          <span style={{fontSize:11, color:C.mid, fontFamily:font}}>{r.cta_principal}</span>
                        </div>
                      )}

                      {/* PROMPT COMPLETO */}
                      <div style={{
                        background:"linear-gradient(135deg,#1a0a2e,#0d0d12)", 
                        border:"2px solid #e879f960", 
                        borderRadius:12, 
                        overflow:"hidden"
                      }}>
                        <div style={{
                          background:"#e879f915", 
                          padding:"12px 16px", 
                          borderBottom:"1px solid #e879f930",
                          display:"flex", 
                          justifyContent:"space-between", 
                          alignItems:"center"
                        }}>
                          <div>
                            <div style={{fontSize:9, color:"#e879f9", letterSpacing:3, fontFamily:font, fontWeight:700}}>
                              🎯 PROMPT COMPLETO (PRONTO PARA COPIAR)
                            </div>
                            <div style={{fontSize:10, color:"#c084fc", marginTop:2, fontFamily:font}}>
                              Avatar: {avatarSorteado.nome} · {palavras} palavras
                            </div>
                          </div>
                          <Btn 
                            onClick={()=>onCopy(promptCompleto, `monet_full_${i}`)} 
                            color={copied===`monet_full_${i}`?C.green:C.gold} 
                            style={{padding:"8px 16px", fontSize:11}}
                          >
                            {copied===`monet_full_${i}`?"✓ Copiado!":"📋 Copiar Prompt"}
                          </Btn>
                        </div>
                        <div style={{padding:16, maxHeight:300, overflowY:"auto"}}>
                          <pre style={{
                            fontSize:11, 
                            color:"#e0d6ff", 
                            lineHeight:1.7, 
                            fontFamily:font, 
                            whiteSpace:"pre-wrap",
                            margin:0
                          }}>
                            {promptCompleto}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ UGC HAND CLONE AGENT ══════════════════ */}
        {aba==="ugcclone" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color="#22d3ee">🤲 UGC HAND CLONE AGENT V1</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>Clone de Movimento de Mão · 10s</div>
            <div style={{fontSize:12, color:C.dim, marginBottom:16, fontFamily:font}}>
              Extrai o DNA de movimento e gera o prompt exato para Veo 3 · Runway · Kling · Minimax
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16}}>
              {[
                {id:"descricao", emoji:"✍️", label:"Descrever",    sub:"Descreva o vídeo em texto",           cor:"#22d3ee"},
                {id:"frames",   emoji:"🎞️", label:"Upload Frames", sub:"Claude Vision analisa quadro a quadro", cor:"#a78bfa"},
                {id:"gemini",   emoji:"🎬", label:"Gemini Nativo", sub:"Vídeo completo via Gemini API",        cor:"#4ade80"},
              ].map(m=>(
                <div key={m.id} onClick={()=>{setCloneMode(m.id);setErro(null);setCloneRes(null);}} style={{
                  background:cloneMode===m.id?m.cor+"18":C.card,
                  border:`2px solid ${cloneMode===m.id?m.cor:C.border}`,
                  borderRadius:13, padding:"16px 12px", cursor:"pointer", transition:"all .2s", textAlign:"center"
                }}>
                  <div style={{fontSize:26, marginBottom:6}}>{m.emoji}</div>
                  <div style={{fontSize:12, fontWeight:700, color:cloneMode===m.id?m.cor:C.text, marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:9, color:C.dim, fontFamily:font, lineHeight:1.5}}>{m.sub}</div>
                  {cloneMode===m.id&&<div style={{marginTop:8, fontSize:9, color:m.cor, fontFamily:font, fontWeight:700, letterSpacing:2}}>✓ ATIVO</div>}
                </div>
              ))}
            </div>

            <div style={{background:C.card, border:"1px solid #22d3ee20", borderRadius:12, padding:14, marginBottom:12}}>
              <div style={{fontSize:9, color:"#22d3ee", letterSpacing:2, marginBottom:8, fontFamily:font}}>📦 PRODUTO SENDO SEGURADO (opcional)</div>
              <input style={inp({border:`1px solid ${cloneProd?"#22d3ee60":C.border}`})}
                placeholder="Ex: frasco de sérum 30ml, embalagem whey, caixinha de suplemento..."
                value={cloneProd} onChange={e=>setCloneProd(e.target.value)}/>
            </div>

            {cloneMode==="descricao"&&(
              <div style={{background:C.card, border:"1px solid #22d3ee30", borderRadius:16, padding:20, marginBottom:16}}>
                <div style={{fontSize:9, color:"#22d3ee", letterSpacing:2, marginBottom:8, fontFamily:font}}>🎥 DESCREVA O MOVIMENTO DAS MÃOS NO VÍDEO</div>
                <textarea
                  style={inp({minHeight:160, resize:"vertical", marginBottom:6, fontFamily:font, fontSize:12, lineHeight:1.7, border:`1px solid ${cloneDesc?"#22d3ee60":C.border}`})}
                  placeholder={`Ex: "Mão direita entra pelo lado esquerdo segurando o pote. Gira levemente o pulso pra mostrar o rótulo. Os dedos reajustam o grip no segundo 4. Aproxima devagar da câmera. Segura firme no final com leve tremor natural."\n\nQuanto mais detalhe do movimento, melhor o prompt.`}
                  value={cloneDesc} onChange={e=>{setCloneDesc(e.target.value);setErro(null);}}
                />
                <div style={{fontSize:10, color:C.dim, marginBottom:12, fontFamily:font, textAlign:"right"}}>
                  {cloneDesc.trim().split(/\s+/).filter(Boolean).length} palavras
                </div>
                {erro&&<ErrBox msg={erro}/>}
                <Btn onClick={gerarClone} disabled={loading||!cloneDesc.trim()} color="#22d3ee" style={{width:"100%", fontSize:14, padding:"14px"}}>
                  {loading?"⟳ Extraindo DNA de movimento...":"✍️ Gerar Motion Prompt"}
                </Btn>
              </div>
            )}

            {cloneMode==="frames"&&(
              <div style={{background:C.card, border:"1px solid #a78bfa30", borderRadius:16, padding:20, marginBottom:16}}>
                <div style={{fontSize:9, color:"#a78bfa", letterSpacing:2, marginBottom:8, fontFamily:font}}>🎞️ UPLOAD DO VÍDEO REFERÊNCIA</div>
                <div style={{fontSize:11, color:C.dim, marginBottom:12, lineHeight:1.6, fontFamily:font}}>
                  O sistema extrai <strong style={{color:C.text}}>8 frames</strong> automaticamente via Canvas API e envia para o Claude Vision analisar a progressão do movimento.
                </div>
                <label style={{display:"block", marginBottom:16}}>
                  <div style={{
                    background:cloneVideo?"#a78bfa18":C.card2, border:`2px dashed ${cloneVideo?"#a78bfa":"#333"}`,
                    borderRadius:12, padding:"28px 20px", textAlign:"center", cursor:"pointer", transition:"all .2s"
                  }}>
                    {cloneVideo ? (
                      <>
                        <div style={{fontSize:28, marginBottom:6}}>🎞️</div>
                        <div style={{fontSize:13, fontWeight:600, color:"#a78bfa"}}>{cloneVideo.name}</div>
                        <div style={{fontSize:11, color:C.dim, fontFamily:font, marginTop:4}}>
                          {(cloneVideo.size/1024/1024).toFixed(1)} MB · Clique para trocar
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{fontSize:32, marginBottom:8}}>📁</div>
                        <div style={{fontSize:13, color:C.mid}}>Clique para selecionar o vídeo</div>
                        <div style={{fontSize:11, color:C.dim, fontFamily:font, marginTop:4}}>MP4 · MOV · WebM · max ~50MB</div>
                      </>
                    )}
                  </div>
                  <input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{setCloneVideo(e.target.files[0]||null);setCloneRes(null);setCloneFrames([]);setErro(null);}}/>
                </label>

                {cloneFrames.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9, color:"#a78bfa", letterSpacing:2, marginBottom:8, fontFamily:font}}>{cloneFrames.length} FRAMES EXTRAÍDOS</div>
                    <div style={{display:"flex", gap:6, overflowX:"auto", paddingBottom:4}}>
                      {cloneFrames.map((f,i)=>(
                        <div key={i} style={{flexShrink:0, textAlign:"center"}}>
                          <img src={`data:image/jpeg;base64,${f.data}`} alt={f.time}
                            style={{width:80, height:60, objectFit:"cover", borderRadius:6, border:"1px solid #a78bfa40"}}/>
                          <div style={{fontSize:9, color:C.dim, marginTop:2, fontFamily:font}}>{f.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cloneProgress&&<div style={{padding:"10px 14px", background:"#a78bfa18", border:"1px solid #a78bfa30", borderRadius:8, fontSize:12, color:"#a78bfa", marginBottom:12, fontFamily:font}}>
                  <span style={{width:12, height:12, border:"2px solid #a78bfa", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite", marginRight:8, verticalAlign:"middle"}}/>
                  {cloneProgress}
                </div>}
                {erro&&<ErrBox msg={erro}/>}
                <Btn onClick={gerarClone} disabled={loading||!cloneVideo} color="#a78bfa" style={{width:"100%", fontSize:14, padding:"14px"}}>
                  {loading?"⟳ Processando frames...":"🎞️ Extrair Frames e Analisar"}
                </Btn>
              </div>
            )}

            {cloneMode==="gemini"&&(
              <div style={{background:C.card, border:"1px solid #4ade8030", borderRadius:16, padding:20, marginBottom:16}}>
                <div style={{background:"#4ade8008", border:"1px solid #4ade8030", borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", gap:10}}>
                  <span style={{fontSize:14}}>⭐</span>
                  <div style={{fontSize:11, color:"#86efac", fontFamily:font, lineHeight:1.6}}>
                    <strong style={{color:"#4ade80"}}>Melhor qualidade.</strong> O Gemini 2.0 Flash analisa o vídeo completo frame a frame nativamente, sem extração manual. Requer sua API Key gratuita do Google AI Studio.
                  </div>
                </div>

                <div style={{fontSize:9, color:"#4ade80", letterSpacing:2, marginBottom:8, fontFamily:font}}>🔑 GEMINI API KEY</div>
                <div style={{display:"flex", gap:8, marginBottom:8}}>
                  <input
                    type={showGeminiKey?"text":"password"}
                    style={inp({flex:1, border:`1px solid ${
                      geminiStatus==="ok"?"#4ade8060":
                      geminiStatus==="error"?"#f8717160":
                      cloneGeminiKey?"#4ade8030":C.border
                    }`, fontFamily:font})}
                    placeholder="AIza..."
                    value={cloneGeminiKey}
                    onChange={e=>{setCloneGeminiKey(e.target.value); setGeminiStatus("idle");}}
                    onBlur={e=>e.target.value.trim()&&testarGemini(e.target.value)}
                  />
                  <button onClick={()=>setShowGeminiKey(v=>!v)} style={{
                    background:C.card2, border:`1px solid ${C.border}`, borderRadius:10,
                    padding:"0 14px", color:C.mid, cursor:"pointer", fontSize:14, flexShrink:0
                  }}>{showGeminiKey?"🙈":"👁️"}</button>
                  <button onClick={()=>testarGemini(cloneGeminiKey)} disabled={!cloneGeminiKey.trim()||geminiStatus==="testing"} style={{
                    background: geminiStatus==="ok"?"#4ade8018": geminiStatus==="error"?"#ff000018":C.card2,
                    border:`1px solid ${geminiStatus==="ok"?"#4ade8040":geminiStatus==="error"?"#f8717140":C.border}`,
                    borderRadius:10, padding:"0 16px", cursor:"pointer", fontSize:11, fontFamily:font, fontWeight:700, flexShrink:0,
                    color: geminiStatus==="ok"?"#4ade80": geminiStatus==="error"?"#f87171": C.mid,
                    opacity: !cloneGeminiKey.trim()?0.4:1,
                  }}>
                    {geminiStatus==="testing"?"⟳":geminiStatus==="ok"?"✓ OK":geminiStatus==="error"?"✗ Erro":"Testar"}
                  </button>
                </div>
                {geminiStatus==="ok"&&<div style={{fontSize:10, color:"#4ade80", fontFamily:font, marginBottom:12}}>✅ Key válida{geminiLatency?` · ${geminiLatency}ms`:""} — pronto para usar</div>}
                {geminiStatus==="error"&&<div style={{fontSize:10, color:"#f87171", fontFamily:font, marginBottom:12}}>❌ Key inválida ou sem permissão para Gemini 2.0 Flash</div>}
                <div style={{fontSize:10, color:C.dim, marginBottom:16, fontFamily:font}}>
                  Sem key? → <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{color:"#4ade80"}}>aistudio.google.com/apikey</a> · 100% gratuito
                </div>

                <div style={{fontSize:9, color:"#4ade80", letterSpacing:2, marginBottom:8, fontFamily:font}}>🎬 VÍDEO REFERÊNCIA</div>
                <label style={{display:"block", marginBottom:16}}>
                  <div style={{
                    background:cloneVideo?"#4ade8018":C.card2, border:`2px dashed ${cloneVideo?"#4ade80":"#333"}`,
                    borderRadius:12, padding:"28px 20px", textAlign:"center", cursor:"pointer", transition:"all .2s"
                  }}>
                    {cloneVideo ? (
                      <>
                        <div style={{fontSize:28, marginBottom:6}}>🎬</div>
                        <div style={{fontSize:13, fontWeight:600, color:"#4ade80"}}>{cloneVideo.name}</div>
                        <div style={{fontSize:11, color:C.dim, fontFamily:font, marginTop:4}}>
                          {(cloneVideo.size/1024/1024).toFixed(1)} MB · Clique para trocar
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{fontSize:32, marginBottom:8}}>📁</div>
                        <div style={{fontSize:13, color:C.mid}}>Clique para selecionar o vídeo</div>
                        <div style={{fontSize:11, color:C.dim, fontFamily:font, marginTop:4}}>MP4 · MOV · WebM · MKV</div>
                      </>
                    )}
                  </div>
                  <input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{setCloneVideo(e.target.files[0]||null);setCloneRes(null);setErro(null);}}/>
                </label>

                {cloneProgress&&<div style={{padding:"10px 14px", background:"#4ade8018", border:"1px solid #4ade8030", borderRadius:8, fontSize:12, color:"#4ade80", marginBottom:12, fontFamily:font}}>
                  <span style={{width:12, height:12, border:"2px solid #4ade80", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite", marginRight:8, verticalAlign:"middle"}}/>
                  {cloneProgress}
                </div>}
                {erro&&<ErrBox msg={erro}/>}
                <Btn onClick={gerarClone} disabled={loading||!cloneVideo||!cloneGeminiKey.trim()} color="#4ade80" style={{width:"100%", fontSize:14, padding:"14px"}}>
                  {loading?"⟳ Enviando para o Gemini...":"🎬 Analisar Vídeo com Gemini 2.0"}
                </Btn>
              </div>
            )}

            <div style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:16}}>
              <div style={{fontSize:9, color:"#22d3ee", letterSpacing:2, marginBottom:10, fontFamily:font}}>⏱ ESTRUTURA 10s · DNA DO AGENTE</div>
              <div style={{display:"grid", gap:6}}>
                {[["0s–2s","👋","Mão entra no frame naturalmente"],["2s–4s","🤝","Estabilização e posicionamento suave"],["4s–6s","🔄","Interação lenta ou rotação do produto"],["6s–8s","➡️","Movimento suave em direção à câmera"],["8s–10s","🛑","Hold final com micro movimento"]].map(([t,e,l])=>(
                  <div key={t} style={{display:"flex", gap:10, alignItems:"center"}}>
                    <span style={{fontSize:10, color:"#22d3ee", fontFamily:font, minWidth:52, flexShrink:0}}>{t}</span>
                    <span style={{fontSize:13}}>{e}</span>
                    <span style={{fontSize:11, color:C.mid}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {cloneRes&&(
              <div style={{animation:"fadeUp .3s ease"}}>
                {cloneRes.analise&&(
                  <div style={{background:"#22d3ee08", border:"1px solid #22d3ee30", borderRadius:14, padding:18, marginBottom:12}}>
                    <div style={{fontSize:9, color:"#22d3ee", letterSpacing:2, marginBottom:12, fontFamily:font}}>🔬 MOTION ANALYSIS</div>
                    <div style={{fontSize:12, color:C.mid, lineHeight:1.9, whiteSpace:"pre-wrap", fontFamily:font}}>{cloneRes.analise}</div>
                  </div>
                )}
                {cloneRes.resumo&&(
                  <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:12}}>
                    <div style={{fontSize:9, color:"#22d3ee", letterSpacing:2, marginBottom:10, fontFamily:font}}>📋 MOTION BEHAVIOR SUMMARY</div>
                    <div style={{fontSize:13, color:C.text, lineHeight:1.8}}>{cloneRes.resumo}</div>
                  </div>
                )}
                {(cloneRes.prompt||(!cloneRes.prompt&&cloneRes.raw))&&(
                  <div style={{background:"linear-gradient(135deg,#083344,#0c1a1f)", border:"2px solid #22d3ee60", borderRadius:16, overflow:"hidden"}}>
                    <div style={{background:"#22d3ee15", padding:"14px 18px", borderBottom:"1px solid #22d3ee30", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:9, color:"#22d3ee", letterSpacing:3, fontFamily:font, fontWeight:700}}>🎯 FINAL IMAGE-TO-VIDEO MOTION PROMPT</div>
                        <div style={{fontSize:10, color:"#67e8f9", marginTop:2, fontFamily:font}}>Pronto para Veo 3 · Runway · Kling · Minimax</div>
                      </div>
                      <Btn onClick={()=>onCopy(cloneRes.prompt||cloneRes.raw,"clone_prompt")} color={copied==="clone_prompt"?"#22d3ee":C.gold} style={{padding:"8px 16px", fontSize:11}}>
                        {copied==="clone_prompt"?"✓ Copiado!":"📋 Copiar Prompt"}
                      </Btn>
                    </div>
                    <div style={{padding:20}}>
                      <div style={{fontSize:14, color:"#e0f7fa", lineHeight:1.9, fontFamily:font, fontStyle:"italic"}}>
                        "{cloneRes.prompt||cloneRes.raw}"
                      </div>
                    </div>
                  </div>
                )}
                <div style={{marginTop:12, background:"#1a0a00", border:"1px solid #fb923c30", borderRadius:10, padding:"10px 14px", display:"flex", gap:10}}>
                  <span style={{fontSize:14, flexShrink:0}}>🔒</span>
                  <div style={{fontSize:11, color:"#fdba74", fontFamily:font, lineHeight:1.6}}>
                    <strong style={{color:"#fb923c"}}>VISUAL LOCK ATIVO:</strong> Face, corpo, produto, roupa, cores, iluminação e fundo são preservados. Apenas o movimento é transferido.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ MODELAR COPY VIRAL ══════════════════ */}
        {aba==="modelar" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color="#fb923c">✂️ MODELAR COPY VIRAL</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:4}}>Transcrição longa → Roteiro curto</div>
            <div style={{fontSize:12, color:C.dim, marginBottom:20, fontFamily:font}}>
              Cole qualquer UGC real (2min+) · O sistema extrai a engenharia e recria condensado
            </div>

            <div style={{background:C.card, border:`1px solid #fb923c30`, borderRadius:16, padding:20, marginBottom:16}}>
              <div style={{fontSize:9, color:"#fb923c", letterSpacing:2, marginBottom:8, fontFamily:font}}>
                📋 COLE A TRANSCRIÇÃO DO VÍDEO VIRAL
              </div>
              <textarea
                style={inp({minHeight:200, resize:"vertical", marginBottom:16, fontFamily:font, fontSize:12, lineHeight:1.7, border:`1px solid ${modelarTxt?"#fb923c60":C.border}`})}
                placeholder={`Cole aqui a transcrição completa do vídeo...\n\nEx: "Gente, eu preciso te contar uma coisa que ninguém fala sobre protetor solar. Eu usava protetor todo dia, me achava protegida, mas minha pele continuava manchando. Fui no dermatologista e ela me falou que o protetor que eu usava não tinha proteção UVA de verdade..."`}
                value={modelarTxt}
                onChange={e=>{setModelarTxt(e.target.value); setErro(null);}}
              />

              {modelarTxt&&(
                <div style={{fontSize:10, color:C.dim, marginBottom:16, fontFamily:font, textAlign:"right"}}>
                  📊 Original: <strong style={{color:C.text}}>{modelarTxt.trim().split(/\s+/).filter(Boolean).length} palavras</strong>
                </div>
              )}

              <div style={{fontSize:9, color:"#fb923c", letterSpacing:2, marginBottom:12, fontFamily:font}}>
                ✂️ LIMITE DE PALAVRAS DA VERSÃO CONDENSADA
              </div>
              <div style={{display:"flex", gap:10, marginBottom:16}}>
                {[30, 40].map(n=>(
                  <button key={n} onClick={()=>setModelarLim(n)} style={{
                    flex:1, padding:"16px", fontSize:15, fontWeight:900, fontFamily:font,
                    background:modelarLim===n?"#fb923c":"transparent",
                    color:modelarLim===n?"#000":C.dim,
                    border:`2px solid ${modelarLim===n?"#fb923c":C.border}`,
                    borderRadius:12, cursor:"pointer", transition:"all .2s"
                  }}>
                    <div>{n}</div>
                    <div style={{fontSize:9, fontWeight:400, marginTop:4}}>palavras máx</div>
                  </button>
                ))}
              </div>

              <div style={{fontSize:9, color:"#fb923c", letterSpacing:2, marginBottom:10, fontFamily:font}}>
                🔢 VERSÕES A GERAR
              </div>
              <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:16}}>
                <input type="range" min={1} max={6} step={1} value={modelarQtd} onChange={e=>setModelarQtd(+e.target.value)} style={{flex:1}}/>
                <span style={{fontSize:28, fontWeight:900, color:"#fb923c", minWidth:30, fontFamily:font}}>{modelarQtd}</span>
              </div>

              {form.seoKeyword&&(
                <div style={{background:"#38bdf808", border:"1px solid #38bdf820", borderRadius:8, padding:"8px 12px", marginBottom:16, display:"flex", gap:8, alignItems:"center"}}>
                  <span style={{fontSize:13}}>🔍</span>
                  <span style={{fontSize:11, color:"#38bdf8", fontFamily:font}}>Keyword SEO "<strong>{form.seoKeyword}</strong>" será injetada nas versões</span>
                </div>
              )}

              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}

              <Btn onClick={gerarModelar} disabled={loading||!modelarTxt.trim()} color="#fb923c" style={{width:"100%", fontSize:14, padding:"14px"}}>
                {loading ? "⟳ Extraindo engenharia e condensando..." : `✂️ Modelar em ${modelarLim} palavras · ${modelarQtd} versão${modelarQtd>1?"ões":""}`}
              </Btn>
            </div>

            {s.modelar?.analise&&(
              <div style={{background:"#fb923c0a", border:"1px solid #fb923c30", borderRadius:14, padding:18, marginBottom:16, animation:"fadeUp .3s ease"}}>
                <div style={{fontSize:9, color:"#fb923c", letterSpacing:2, marginBottom:14, fontFamily:font}}>🔬 ENGENHARIA DETECTADA NO ORIGINAL</div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
                  {[
                    ["🎣 Gancho Original", s.modelar.analise.gancho_original],
                    ["😤 Dor Identificada", s.modelar.analise.dor_identificada],
                    ["✅ Solução",          s.modelar.analise.solucao],
                    ["👆 CTA Original",     s.modelar.analise.cta_original],
                  ].map(([k,v])=>(
                    v&&<div key={k} style={{background:C.card2, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 12px"}}>
                      <div style={{fontSize:9, color:"#fb923c", letterSpacing:1, marginBottom:4, fontFamily:font}}>{k}</div>
                      <div style={{fontSize:12, color:C.text, lineHeight:1.5}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:8}}>
                  <span style={{fontSize:10, color:"#fb923c", background:"#fb923c15", border:"1px solid #fb923c30", borderRadius:20, padding:"3px 12px", fontFamily:font, fontWeight:700}}>
                    🏗️ {s.modelar.analise.engenharia}
                  </span>
                </div>
                {s.modelar.analise.gatilhos?.length>0&&(
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    {s.modelar.analise.gatilhos.map((g,i)=>(
                      <span key={i} style={{fontSize:10, color:C.mid, background:C.card2, border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 10px", fontFamily:font}}>⚡ {g}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {s.modelar?.versoes?.length>0&&(
              <div style={{animation:"fadeUp .3s ease"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
                  <div>
                    <div style={{fontSize:9, color:"#fb923c", letterSpacing:3, marginBottom:4, fontFamily:font}}>VERSÕES CONDENSADAS</div>
                    <div style={{fontSize:18, fontWeight:900}}>{s.modelar.versoes.length} roteiros · máx {modelarLim} palavras</div>
                  </div>
                  <Btn onClick={()=>onCopy(s.modelar.versoes.map((v,i)=>`[${v.angulo}]\n${v.roteiro}`).join("\n\n"),"modelar_all")} color={C.green} style={{padding:"9px 16px", fontSize:11}}>
                    {copied==="modelar_all"?"✓ Copiados!":"📋 Copiar Todos"}
                  </Btn>
                </div>

                {s.modelar.versoes.map((v,i)=>{
                  const ok = (v.palavras||0) <= modelarLim;
                  const reducao = modelarTxt ? Math.round((1 - v.palavras/modelarTxt.trim().split(/\s+/).filter(Boolean).length)*100) : 0;
                  return (
                    <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:14, animation:`fadeUp .3s ease ${i*.06}s both`}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                        <div style={{display:"flex", gap:8, alignItems:"center"}}>
                          <Badge color="#fb923c">V{v.numero}</Badge>
                          <span style={{fontSize:11, color:"#fb923c", background:"#fb923c15", border:"1px solid #fb923c30", borderRadius:20, padding:"3px 10px", fontFamily:font}}>{v.angulo}</span>
                        </div>
                        <div style={{display:"flex", gap:8, alignItems:"center"}}>
                          <span style={{fontSize:10, background:ok?C.greend:C.pinkd, color:ok?C.green:C.pink, padding:"3px 10px", borderRadius:20, fontFamily:font}}>
                            {v.palavras} pal {ok?"✓":"⚠"}
                          </span>
                          {reducao>0&&<span style={{fontSize:10, color:C.green, background:C.greend, padding:"3px 10px", borderRadius:20, fontFamily:font}}>-{reducao}%</span>}
                        </div>
                      </div>

                      <div onClick={()=>onCopy(v.roteiro,`mod${i}`)} style={{
                        background:"#fb923c08", border:`1px solid ${copied===`mod${i}`?C.green:"#fb923c30"}`,
                        borderRadius:10, padding:"16px 14px", cursor:"pointer", marginBottom:12, transition:"all .15s"
                      }}>
                        <div style={{fontSize:16, fontWeight:600, lineHeight:1.7, color:C.text}}>{v.roteiro}</div>
                        <div style={{fontSize:9, color:copied===`mod${i}`?C.green:C.dim, marginTop:8, fontFamily:font}}>
                          {copied===`mod${i}`?"✓ copiado!":"clique para copiar"}
                        </div>
                      </div>

                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                        {v.hook&&(
                          <div style={{background:C.card2, borderRadius:8, padding:"8px 10px"}}>
                            <div style={{fontSize:8, color:C.gold, letterSpacing:2, marginBottom:3, fontFamily:font}}>⚡ HOOK</div>
                            <div style={{fontSize:11, color:C.text}}>{v.hook}</div>
                          </div>
                        )}
                        {v.cta&&(
                          <div style={{background:C.card2, borderRadius:8, padding:"8px 10px"}}>
                            <div style={{fontSize:8, color:C.green, letterSpacing:2, marginBottom:3, fontFamily:font}}>👆 CTA</div>
                            <div style={{fontSize:11, color:C.text}}>{v.cta}</div>
                          </div>
                        )}
                      </div>
                      {v.engenharia_aplicada&&(
                        <div style={{fontSize:10, color:C.dim, marginTop:8, fontFamily:font}}>
                          🏗️ <span style={{color:"#fb923c"}}>{v.engenharia_aplicada}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ SHIELD ══════════════════ */}
        {aba==="shield" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Badge color={C.green}>🛡️ COMPLIANCE SHIELD</Badge>
            <div style={{fontSize:20, fontWeight:800, marginBottom:16}}>Scanner de Compliance TikTok</div>
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20}}>
              <textarea style={inp({minHeight:120, resize:"vertical", marginBottom:12})}
                placeholder="Cole hook, roteiro ou legenda para analisar..."
                value={shieldTxt} onChange={e=>{setShieldTxt(e.target.value);setErro(null);}}
              />
              {erro&&<div style={{padding:"10px 14px", background:C.pinkd, border:`1px solid ${C.pink}40`, borderRadius:8, fontSize:12, color:C.pink, marginBottom:12}}>⚠️ {erro}</div>}
              <Btn onClick={gerarShield} disabled={loading||!shieldTxt.trim()} color={C.green}>
                {loading?"⟳ Analisando...":"🛡️ Analisar Compliance"}
              </Btn>
            </div>
            {s.shield?.shield&&(()=>{
              const sh = s.shield.shield;
              const cor = sh.score>=80?C.green:sh.score>=60?C.orange:C.pink;
              return (
                <div style={{background:C.card, border:`2px solid ${cor}40`, borderRadius:16, padding:22, animation:"fadeUp .3s ease"}}>
                  <div style={{display:"flex", alignItems:"center", gap:20, marginBottom:16, flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:10, color:C.dim, letterSpacing:2, marginBottom:4, fontFamily:font}}>SCORE</div>
                      <div style={{fontSize:48, fontWeight:900, color:cor, fontFamily:font}}>{sh.score}<span style={{fontSize:18}}>/100</span></div>
                    </div>
                    <div style={{fontSize:16, fontWeight:700, color:cor}}>{sh.nivel}</div>
                  </div>
                  <ScoreBar score={sh.score}/>
                  <div style={{fontSize:12, color:C.mid, lineHeight:1.7, background:C.card2, borderRadius:8, padding:"10px 12px", marginBottom:14}}>{sh.resumo}</div>
                  {sh.violacoes?.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:9, color:C.pink, letterSpacing:2, marginBottom:6, fontFamily:font}}>❌ VIOLAÇÕES</div>
                      {sh.violacoes.map((v,i)=><div key={i} style={{fontSize:11, color:C.pink, marginBottom:3}}>• {v}</div>)}
                    </div>
                  )}
                  {sh.pontos_positivos?.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:9, color:C.green, letterSpacing:2, marginBottom:6, fontFamily:font}}>✅ PONTOS POSITIVOS</div>
                      {sh.pontos_positivos.map((v,i)=><div key={i} style={{fontSize:11, color:C.green, marginBottom:3}}>• {v}</div>)}
                    </div>
                  )}
                  {sh.texto_corrigido&&(
                    <div style={{background:C.card, border:`1px solid ${C.green}30`, borderRadius:12, overflow:"hidden"}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderBottom:`1px solid ${C.border}`}}>
                        <div style={{fontSize:10, color:C.green, letterSpacing:2, fontFamily:font}}>✨ TEXTO CORRIGIDO</div>
                        <Btn onClick={()=>onCopy(sh.texto_corrigido,"shield_fix")} color={copied==="shield_fix"?C.green:C.gold} style={{padding:"5px 12px", fontSize:10}}>
                          {copied==="shield_fix"?"✓ Copiado!":"📋 Copiar"}
                        </Btn>
                      </div>
                      <div style={{padding:14, fontSize:13, lineHeight:1.8}}>{sh.texto_corrigido}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <div style={{borderTop:`1px solid ${C.border}`, padding:"20px", textAlign:"center", marginTop:20}}>
        <div style={{fontSize:9, letterSpacing:5, color:C.gold, marginBottom:4, fontFamily:font}}>🔥 ULTIMATE SUPREME MERGED · CLAUDE NATIVE</div>
        <div style={{fontSize:11, color:C.dim, fontFamily:font}}>FastMoss BR · Agent · Hooks · Million$ · Roteiros 5F · Coringa · Meta Ads · Legendas · Modelar · UGC Clone · Veo 3 · CBO · Monetização · Shield</div>
      </div>
    </div>
  );
}
