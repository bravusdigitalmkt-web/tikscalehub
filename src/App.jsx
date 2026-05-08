import { useState, useEffect } from "react";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELOS_DISPONIVEIS = {
  "google/gemini-2.5-flash":                       "⚡ Gemini 2.5 Flash (RECOMENDADO)",
  "deepseek/deepseek-r1:free":                     "🔵 DeepSeek R1 (Grátis · Raciocínio)",
  "deepseek/deepseek-chat-v3-0324:free":           "💨 DeepSeek V3 (Grátis · Rápido)",
  "meta-llama/llama-4-maverick:free":              "🦙 Llama 4 Maverick (Grátis · Potente)",
  "meta-llama/llama-4-scout:free":                 "🦅 Llama 4 Scout (Grátis · Leve)",
  "mistralai/mistral-small-3.1-24b-instruct:free": "🎯 Mistral Small 3.1 (Grátis · Estável)",
};

let modeloAtual = "google/gemini-2.5-flash";
let apiKeyAtual = "";

async function callOpenRouter(systemPrompt, userContent, temperature = 0.9) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKeyAtual}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "TikTok Shop Generator SUPREME",
    },
    body: JSON.stringify({
      model: modeloAtual,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent  },
      ],
      temperature,
      max_tokens: 8000,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API OpenRouter");
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenRouterJSON(systemPrompt, userContent, temperature = 0.9) {
  const text = await callOpenRouter(
    systemPrompt + "\n\n⚠️ CRÍTICO: RESPONDA APENAS COM JSON PURO. SEM ```json, SEM markdown, SEM texto antes/depois.",
    userContent,
    temperature
  );
  let cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch {
    try { return JSON.parse(cleaned.replace(/[""]/g, '"').replace(/['']/g, "'")); }
    catch { return JSON.parse(cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")); }
  }
}

async function testarConexao(apiKey, modelo) {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: "user", content: "Responda apenas: OK" }],
        max_tokens: 10,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.error?.message || "Erro desconhecido" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ═══════════════════════════════════════════════════════
// DADOS
// ═══════════════════════════════════════════════════════

const CATEGORIAS = [
  "Beleza e cuidados pessoais","Saúde","Casa e jardim","Moda feminina",
  "Moda masculina","Esportes","Eletrônicos","Bebê e maternidade",
  "Pet","Alimentos e bebidas","Livros e papelaria","Brinquedos",
  "Automotivo","Ferramentas","Móveis","Decoração","Joias e acessórios",
  "Cuidados com cabelo","Skincare","Maquiagem","Suplementos",
  "Fitness","Tecnologia","Games","Música","Arte","Outro"
];

const BLINDADOR_ULTRA = `
🛡️ BLINDADOR ULTRA - 6 CAMADAS DE PROTEÇÃO:

NÍVEL 1: PROIBIÇÕES ABSOLUTAS
❌ NUNCA USE: "remove","acaba com","cura","elimina","100%","garantido","milagre",
"emagrece","queima gordura","seca barriga","detox","trata doença","efeito botox",
"regenera células","anti-inflamatório","médicos odeiam","segredo proibido"

NÍVEL 2: SUBSTITUIÇÕES OBRIGATÓRIAS
"remove rugas" → "ajuda na aparência da pele"
"cura acne" → "auxilia nos cuidados"
"emagrece" → "complementa rotina saudável"
"cresce cabelo" → "fortalece os fios"

NÍVEL 3: LINGUAGEM LIFESTYLE
✅ USE: "tenho usado","gostei","na minha rotina","percebi","textura","sensação",
"após algumas semanas","com uso contínuo","pode ajudar","auxilia","contribui"

NÍVEL 4: CATEGORIAS DE RISCO
🟢 VERDE (baixo): rotina, textura, experiência
🟡 AMARELO (médio): skincare, cabelo - linguagem extra-suave
🔴 VERMELHO (alto): emagrecimento, acne, anti-idade - MÁXIMO cuidado

NÍVEL 5: REGRAS TÉCNICAS
✅ CTA: "carrinho laranja" (NUNCA "amarelo")
✅ Timeframes: mínimo 2-3 semanas
✅ Tom: experiência pessoal, não promessa
✅ Evitar: antes/depois, depoimentos exagerados, aparência médica

NÍVEL 6: CHECKLIST PRÉ-OUTPUT
Verificar: promessas absolutas, alegações médicas, palavras proibidas, tom lifestyle

CRÍTICO: Estas regras são NÃO-NEGOCIÁVEIS!
`;

const BASE_PROMPT = `Você é especialista em TikTok Shop Brasil, hooks científicos ($1M testado) e copywriting de alta conversão.

COMPLIANCE ULTRA-CRÍTICO:
❌ NUNCA: "remove","cura","elimina","100%","garantido","emagrece","queima gordura"
✅ SEMPRE: "ajuda","auxilia","melhora","contribui","fortalece","complementa"
FOCO: Experiência pessoal, rotina, textura - NÃO promessas.

REGRAS ABSOLUTAS:
• Roteiro: MÁXIMO 30 palavras
• Hashtags: EXATAMENTE 5
• Legenda: 15-20 palavras
• POV Hook: 6-12 palavras
• CTA: "carrinho laranja" (obrigatório)
• Tom: português BR coloquial
• Timeframes: mínimo 2-3 semanas

RESPONDA APENAS COM JSON PURO, sem markdown, sem backticks.`;

const PROMPT_HOOKS = BASE_PROMPT + `
JSON EXATO:
{
  "pov_hooks": [
    {"padrao":"Problema → Solução","hook":"...","estrutura":"...","quando_usar":"...","por_que_funciona":"...","exemplo_variacao":"..."},
    {"padrao":"Nunca Experimentei","hook":"...","estrutura":"...","quando_usar":"...","por_que_funciona":"...","exemplo_variacao":"..."},
    {"padrao":"Prova Social Terceiros","hook":"...","estrutura":"...","quando_usar":"...","por_que_funciona":"...","exemplo_variacao":"..."},
    {"padrao":"E Se Eu Dissesse","hook":"...","estrutura":"...","quando_usar":"...","por_que_funciona":"...","exemplo_variacao":"..."},
    {"padrao":"Tentei Tudo","hook":"...","estrutura":"...","quando_usar":"...","por_que_funciona":"...","exemplo_variacao":"..."}
  ]
}`;

const PROMPT_ROTEIROS = BASE_PROMPT + `
JSON EXATO (3 roteiros):
{
  "roteiros_villain_hero": [
    {"numero":1,"pov_hook":"...","roteiro_narrado":"...","estrutura":"Hook→Villain→Hero→Proof→CTA","villain":"...","hero":"...","proof":"...","legenda_seo":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"],"duracao_estimada":"20-25s","quando_usar":"..."},
    {"numero":2,"pov_hook":"...","roteiro_narrado":"...","estrutura":"Hook→Villain→Hero→Proof→CTA","villain":"...","hero":"...","proof":"...","legenda_seo":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"],"duracao_estimada":"20-25s","quando_usar":"..."},
    {"numero":3,"pov_hook":"...","roteiro_narrado":"...","estrutura":"Hook→Villain→Hero→Proof→CTA","villain":"...","hero":"...","proof":"...","legenda_seo":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"],"duracao_estimada":"15-20s","quando_usar":"..."}
  ]
}
CRÍTICO: roteiro_narrado MÁXIMO 30 PALAVRAS. Sempre termine com "carrinho laranja".`;

const PROMPT_CORINGA = BASE_PROMPT + `
JSON EXATO (10 variações):
{
  "formato_coringa": [
    {"variacao":1,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":2,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":3,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":4,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":5,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":6,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":7,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":8,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":9,"texto":"...","estrutura":"...","quando_usar":"..."},
    {"variacao":10,"texto":"...","estrutura":"...","quando_usar":"..."}
  ]
}
Cada texto: 25-35 palavras. Tom rápido, POV format, sem perder compliance.`;

const PROMPT_ESCALA = BASE_PROMPT + `
Analise o script vencedor e gere variações mantendo a MESMA estrutura, padrão, tom e duração (~30 palavras).
Varie APENAS: Pain language, Emotion words, Result description, Timeframes, Social proof, Price anchors.
JSON EXATO:
{
  "analise": {"padrao_detectado":"...","estrutura":"...","tom_emocional":"...","duracao_palavras":30},
  "variacoes": [
    {"numero":1,"tipo_variacao":"Pain Language","pov_hook":"...","roteiro_narrado":"...","legenda_seo":"...","hashtags":["#t1","#t2","#t3","#t4","#t5"],"o_que_mudou":"X → Y"}
  ]
}`;

const PROMPT_AGENT_FINDER = `Você é o AGENT FINDER 2.0 — especialista em analisar dados do Kalodata e identificar produtos vencedores para TikTok Shop Brasil.

MISSÃO: Extrair dados (mesmo que bagunçados), calcular métricas e ranquear produtos.

CÁLCULOS OBRIGATÓRIOS:
- Receita/criador = GMV ÷ criadores
- Comissão/venda = Preço × taxa comissão (estimar 10% se não informado)
- ROI mês = Comissão/venda × 30 × 30

SCORE (0-100):
SCORE = (Conversão × 0.30) + (Crescimento_normalizado × 0.25) + (Comissão_normalizada × 0.20) + (Receita_criador_normalizada × 0.15) + (Criadores_score × 0.10)

CLASSIFICAÇÃO:
90-100: 🏆 OURO ESCONDIDO
75-89: 🔥 CAVALO DE GUERRA
60-74: 💥 FOGUETE
40-59: ✅ VIÁVEL
abaixo de 40: 🔴 IGNORAR

RED FLAGS:
❌ Preço abaixo R$20 com comissão abaixo 8%
❌ Mais de 200 criadores com crescimento abaixo 50%
❌ Conversão abaixo 15%
❌ Comissão/venda abaixo R$3

JSON EXATO:
{
  "produtos": [
    {
      "nome": "...",
      "categoria": "...",
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
      "por_que": "...",
      "red_flags": [],
      "path_10k": "45 vendas/dia × R$7,49 = R$10.099/mês",
      "descricao_produto": "...",
      "angulos_matadores": ["ângulo 1","ângulo 2","ângulo 3"],
      "hooks_prontos": ["hook 1 pronto para gravar","hook 2","hook 3"],
      "creators_data": "47 creators | GMV R$54k | Conv 80.85%"
    }
  ],
  "top_3": [
    {"posicao":1,"nome":"...","score":99,"recomendacao":"VENDER AGORA!"},
    {"posicao":2,"nome":"...","score":96,"recomendacao":"SEGUNDA PRIORIDADE"},
    {"posicao":3,"nome":"...","score":94,"recomendacao":"TESTE PARALELO"}
  ],
  "resumo": {
    "total_analisados":0,"ouro":0,"cavalo":0,"foguete":0,"viavel":0,"ignorar":0
  }
}
RESPONDA APENAS COM JSON PURO, sem markdown, sem backticks.`;

const PROMPT_META_ADS = `Você é especialista em Meta Ads com $1M+ em ad spend e 500+ hooks testados.
RESPONDA APENAS COM JSON PURO, sem markdown, sem backticks.
JSON EXATO:
{
  "meta_hooks": [
    {"numero":1,"nome":"Problema Salvo","hook_principal":"...","script_completo":"...","variacoes_dor":["...","...","..."],"instrucao_avatar":"...","quando_usar":"...","por_que_converte":"...","nivel_conversao":"ALTO"},
    {"numero":2,"nome":"Nunca Experimentei","hook_principal":"...","script_completo":"...","variacoes_dor":["...","...","..."],"instrucao_avatar":"...","quando_usar":"...","por_que_converte":"...","nivel_conversao":"ALTO"},
    {"numero":3,"nome":"Prova Social Terceiros","hook_principal":"...","script_completo":"...","variacoes_dor":["...","...","..."],"instrucao_avatar":"...","quando_usar":"...","por_que_converte":"...","nivel_conversao":"MUITO ALTO"},
    {"numero":4,"nome":"E Se Eu Dissesse","hook_principal":"...","script_completo":"...","variacoes_dor":["...","...","..."],"instrucao_avatar":"...","quando_usar":"...","por_que_converte":"...","nivel_conversao":"ALTO"},
    {"numero":5,"nome":"Tentei Tudo","hook_principal":"...","script_completo":"...","variacoes_dor":["...","...","..."],"instrucao_avatar":"...","quando_usar":"...","por_que_converte":"...","nivel_conversao":"MÁXIMO"}
  ],
  "estrategia_teste": {"ordem_teste":"...","volume_por_hook":"...","como_escalar":"...","dica_critica":"..."}
}`;

const PROMPT_SHIELD = `Você é especialista em compliance TikTok Shop Brasil.
Analise o texto e identifique violações, promessas exageradas, alegações médicas, palavras proibidas.
SCORE: 100=perfeito · 80-99=pequeno ajuste · 60-79=atenção · 40-59=risco · 0-39=ban
NÍVEL: VERDE=80+ · AMARELO=60-79 · VERMELHO=0-59
GRAVIDADE: ALTA=ban · MÉDIA=advertência · BAIXA=risco menor
JSON EXATO:
{
  "score_seguranca": 85,
  "nivel_risco": "VERDE",
  "aprovado": true,
  "violacoes": [{"tipo":"...","trecho":"...","gravidade":"ALTA","motivo":"...","sugestao":"..."}],
  "pontos_positivos": ["...","..."],
  "texto_corrigido": "...",
  "resumo": "..."
}
RESPONDA APENAS COM JSON PURO, sem markdown, sem backticks.`;

// ═══════════════════════════════════════════════════════
// DESIGN
// ═══════════════════════════════════════════════════════

const C = {
  bg:"#050505", card:"#0d0d0d", card2:"#0a0a0a", border:"#1a1a1a",
  text:"#f0e8d8", textDim:"#666", textMid:"#999",
  gold:"#ffd700", goldDim:"#ffd70020",
  accent:"#ff1493", accentDim:"#ff149320",
  success:"#00ff88", successDim:"#00ff8820",
  warning:"#ff9800", warningDim:"#ff980020",
  info:"#00bfff", infoDim:"#00bfff20",
  purple:"#a855f7", purpleDim:"#a855f720",
  blue:"#06b6d4",
};

const inp = (extra = {}) => ({
  width:"100%", boxSizing:"border-box", background:C.card2,
  border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 16px",
  color:C.text, fontSize:14, fontFamily:"inherit", outline:"none", ...extra,
});

const btn = (disabled = false, cor = C.gold) => ({
  background: disabled ? C.card2 : cor,
  border:"none", borderRadius:10, padding:"12px 20px",
  color: disabled ? C.textDim : "#000", fontSize:13, fontWeight:700,
  cursor: disabled ? "not-allowed" : "pointer", fontFamily:"inherit",
  opacity: disabled ? 0.5 : 1, transition:"all 0.2s",
});

// ═══════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════

function Badge({ children, color = C.gold }) {
  return (
    <span style={{ fontSize:9, color, background:color+"15", border:`1px solid ${color}30`, padding:"3px 10px", borderRadius:20, letterSpacing:2, fontWeight:700, display:"inline-block", marginBottom:10 }}>
      {children}
    </span>
  );
}

function CopyBox({ label, content, id, copied, onCopy, color = C.gold, large = false }) {
  if (!content) return null;
  const ok = copied === id;
  return (
    <div onClick={() => onCopy(content, id)} style={{ background:color+"08", border:`1px solid ${ok?C.success:color+"30"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", marginBottom:10, transition:"all 0.2s" }}>
      <div style={{ fontSize:8, color, letterSpacing:3, marginBottom:6, fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:large?16:13, fontWeight:large?700:400, lineHeight:1.7, color:C.text }}>{content}</div>
      <div style={{ fontSize:9, color:ok?C.success:C.textDim, marginTop:8 }}>{ok?"✓ copiado!":"clique para copiar"}</div>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 20px", color:C.textDim }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12 }}>{sub}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════

export default function TikTokShopGeneratorSupreme() {
  const [apiKey, setApiKey]               = useState("");
  const [modelo, setModelo]               = useState("google/gemini-2.5-flash");
  const [apiStatus, setApiStatus]         = useState(null);
  const [apiConfigurada, setApiConfigurada] = useState(false);
  const [mostrarKey, setMostrarKey]       = useState(false);

  const [form, setForm] = useState({
    nome:"", valor:"", categoria:"Beleza e cuidados pessoais",
    descricao:"", creators:"", copyViral:"",
  });
  const [blindador, setBlindador] = useState(true);

  const [aba, setAba]             = useState("config");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState(null);
  const [resultado, setResultado] = useState(null);
  const [tipoAtual, setTipoAtual] = useState(null);
  const [copied, setCopied]       = useState(null);

  const [scriptVencedor, setScriptVencedor]   = useState("");
  const [numVariacoes, setNumVariacoes]       = useState(20);
  const [loadingEscala, setLoadingEscala]     = useState(false);
  const [resultadoEscala, setResultadoEscala] = useState(null);

  const [dadosKalodata, setDadosKalodata]   = useState("");
  const [loadingAgent, setLoadingAgent]     = useState(false);
  const [resultadoAgent, setResultadoAgent] = useState(null);

  const [loadingMeta, setLoadingMeta]     = useState(false);
  const [resultadoMeta, setResultadoMeta] = useState(null);
  const [abaMetaAtiva, setAbaMetaAtiva]   = useState(0);

  const [textoShield, setTextoShield]       = useState("");
  const [loadingShield, setLoadingShield]   = useState(false);
  const [resultadoShield, setResultadoShield] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("tiktok_supreme_config");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setApiKey(config.apiKey || "");
        setModelo(config.modelo || "google/gemini-2.5-flash");
        modeloAtual = config.modelo || "google/gemini-2.5-flash";
        apiKeyAtual = config.apiKey || "";
        if (config.apiKey) setApiConfigurada(true);
      } catch {}
    }
  }, []);

  const onCopy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const conectar = async () => {
    if (!apiKey.trim()) { setApiStatus({ success:false, message:"Cole sua API Key!" }); return; }
    setApiStatus(null);
    const res = await testarConexao(apiKey, modelo);
    setApiStatus(res);
    if (res.success) {
      modeloAtual = modelo;
      apiKeyAtual = apiKey;
      setApiConfigurada(true);
      localStorage.setItem("tiktok_supreme_config", JSON.stringify({ apiKey, modelo }));
    }
  };

  const gerar = async (tipo) => {
    if (!apiConfigurada) { setErro("Configure a API primeiro!"); setAba("config"); return; }
    if (!form.nome || !form.valor || !form.descricao) { setErro("Preencha nome, valor e descrição!"); return; }
    setErro(null); setLoading(true); setResultado(null);
    const prompts = { hooks:PROMPT_HOOKS, roteiros:PROMPT_ROTEIROS, coringa:PROMPT_CORINGA };
    const system = prompts[tipo] + (blindador ? "\n\n" + BLINDADOR_ULTRA : "");
    const user = `Produto: ${form.nome}\nValor: R$${form.valor}\nCategoria: ${form.categoria}\nDescrição: ${form.descricao}${form.creators?`\n\nCreators:\n${form.creators}`:""}${form.copyViral?`\n\n📺 COPY VIRAL DE REFERÊNCIA:\n"${form.copyViral}"\n\nMODELE a estrutura e padrões desta copy nos scripts.`:""}`;
    try {
      const data = await callOpenRouterJSON(system, user);
      setResultado(data); setTipoAtual(tipo); setAba(tipo);
    } catch(e) { setErro(e.message); }
    setLoading(false);
  };

  const gerarEscala = async () => {
    if (!apiConfigurada) { setErro("Configure a API primeiro!"); setAba("config"); return; }
    if (!scriptVencedor.trim()) { setErro("Cole o script vencedor!"); return; }
    setErro(null); setLoadingEscala(true); setResultadoEscala(null);
    const system = PROMPT_ESCALA + (blindador ? "\n\n" + BLINDADOR_ULTRA : "");
    const user = `SCRIPT VENCEDOR:\n"${scriptVencedor}"\n${form.copyViral?`\nCOPY VIRAL:\n"${form.copyViral}"\n`:""}\nGere ${numVariacoes} variações científicas.`;
    try {
      const data = await callOpenRouterJSON(system, user, 0.9);
      setResultadoEscala(data); setAba("escala");
    } catch(e) { setErro(e.message); }
    setLoadingEscala(false);
  };

  const analisarKalodata = async () => {
    if (!apiConfigurada) { setErro("Configure a API primeiro!"); setAba("config"); return; }
    if (!dadosKalodata.trim()) { setErro("Cole os dados do Kalodata!"); return; }
    setErro(null); setLoadingAgent(true); setResultadoAgent(null);
    try {
      const data = await callOpenRouterJSON(
        PROMPT_AGENT_FINDER,
        `DADOS KALODATA:\n\n${dadosKalodata}\n\nAnalise TODOS os produtos, calcule scores e retorne JSON estruturado.`,
        0.7
      );
      setResultadoAgent(data); setAba("agent");
    } catch(e) { setErro(e.message); }
    setLoadingAgent(false);
  };

  const usarProduto = (produto) => {
    setForm({
      ...form,
      nome: produto.nome,
      valor: produto.valor?.toString() || "",
      categoria: produto.categoria || "Beleza e cuidados pessoais",
      descricao: produto.descricao_produto || "",
      creators: produto.creators_data || "",
    });
    setAba("produto");
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const gerarMetaAds = async () => {
    if (!apiConfigurada) { setErro("Configure a API primeiro!"); setAba("config"); return; }
    if (!form.nome || !form.descricao) { setErro("Preencha nome e descrição!"); return; }
    setErro(null); setLoadingMeta(true); setResultadoMeta(null);
    const user = `Produto: ${form.nome}\nValor: R$${form.valor}\nCategoria: ${form.categoria}\nDescrição: ${form.descricao}\n\nGere os 5 hooks Meta Ads adaptados para este produto!`;
    try {
      const data = await callOpenRouterJSON(PROMPT_META_ADS, user, 0.85);
      setResultadoMeta(data); setAbaMetaAtiva(0);
    } catch(e) { setErro(e.message); }
    setLoadingMeta(false);
  };

  const analisarShield = async () => {
    if (!apiConfigurada) { setErro("Configure a API primeiro!"); setAba("config"); return; }
    if (!textoShield.trim()) { setErro("Cole o texto para analisar!"); return; }
    setErro(null); setLoadingShield(true); setResultadoShield(null);
    try {
      const data = await callOpenRouterJSON(PROMPT_SHIELD, `Analise este texto para TikTok Shop Brasil:\n\n"${textoShield}"`);
      setResultadoShield(data);
    } catch(e) { setErro(e.message); }
    setLoadingShield(false);
  };

  const ABAS = [
    { id:"config",   label:"⚙️ Config",   cor:C.gold   },
    { id:"agent",    label:"🔍 Agent",    cor:C.purple },
    { id:"produto",  label:"📦 Produto",  cor:C.gold   },
    { id:"meta",     label:"📘 Meta Ads", cor:C.info   },
    { id:"hooks",    label:"🎣 Hooks",    cor:C.gold   },
    { id:"roteiros", label:"🎬 Roteiros", cor:C.gold   },
    { id:"coringa",  label:"🔥 Coringa",  cor:C.accent },
    { id:"escala",   label:"🚀 Escala",   cor:C.info   },
    { id:"shield",   label:"🛡️ Shield",   cor:C.success},
  ];

  const corRiscoShield = resultadoShield?.nivel_risco==="VERDE"?C.success:resultadoShield?.nivel_risco==="AMARELO"?C.warning:C.accent;
  const scoreColorShield = !resultadoShield?C.textDim:resultadoShield.score_seguranca>=80?C.success:resultadoShield.score_seguranca>=60?C.warning:C.accent;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Inter', sans-serif", color:C.text }}>

      {/* HEADER */}
      <div style={{ borderBottom:`1px solid ${C.border}`, background:`linear-gradient(180deg,#0f0a05 0%,${C.bg} 100%)`, padding:"20px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontSize:9, letterSpacing:5, color:C.gold, marginBottom:6, fontWeight:700 }}>🔥 SISTEMA HÍBRIDO SUPREME</div>
          <h1 style={{ fontSize:28, fontWeight:900, margin:"0 0 4px", background:`linear-gradient(135deg,${C.gold},${C.accent})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            TikTok Shop Generator SUPREME
          </h1>
          <p style={{ fontSize:11, color:C.textDim, margin:0 }}>OpenRouter · Agent Finder · Meta Ads · Shield · 6 Camadas · Copy Viral</p>
          {apiConfigurada&&(
            <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:8, background:C.successDim, border:`1px solid ${C.success}30`, borderRadius:20, padding:"5px 14px", fontSize:11, color:C.success }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.success }} />
              Sistema Ativo · {MODELOS_DISPONIVEIS[modelo]?.split("(")[0] || modelo}
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottom:`1px solid ${C.border}`, background:C.card, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", overflowX:"auto", padding:"0 20px" }}>
          {ABAS.map(a=>{
            const ativo = aba===a.id;
            return (
              <button key={a.id} onClick={()=>setAba(a.id)} style={{ background:"none", border:"none", borderBottom:`2px solid ${ativo?a.cor:"transparent"}`, padding:"12px 16px", cursor:"pointer", fontFamily:"inherit", color:ativo?a.cor:C.textDim, fontSize:13, fontWeight:ativo?700:400, whiteSpace:"nowrap", transition:"all 0.2s" }}>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"30px 20px" }}>

        {/* CONFIG */}
        {aba==="config"&&(
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", maxWidth:600, margin:"0 auto" }}>
            <div style={{ padding:"20px 24px", background:`linear-gradient(135deg,${C.gold}08,transparent)`, borderBottom:`1px solid ${C.border}` }}>
              <Badge>⚙️ CONFIGURAÇÃO</Badge>
              <div style={{ fontSize:18, fontWeight:700, color:C.text }}>OpenRouter API</div>
              <div style={{ fontSize:12, color:C.textDim, marginTop:4 }}>Grátis · Múltiplos modelos · Chave salva automaticamente</div>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:C.textMid, letterSpacing:2, marginBottom:10 }}>🔑 API KEY</div>
                <div style={{ position:"relative" }}>
                  <input type={mostrarKey?"text":"password"} style={inp({paddingRight:48})} placeholder="sk-or-v1-..." value={apiKey} onChange={e=>{setApiKey(e.target.value);setApiStatus(null);}} />
                  <button onClick={()=>setMostrarKey(!mostrarKey)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textMid, padding:0 }}>
                    {mostrarKey?"🙈":"👁️"}
                  </button>
                </div>
                <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer" style={{ fontSize:11, color:C.info, textDecoration:"none", display:"block", marginTop:8 }}>
                  → Pegar chave gratuita no OpenRouter
                </a>
              </div>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, color:C.textMid, letterSpacing:2, marginBottom:10 }}>🤖 MODELO</div>
                <div style={{ display:"grid", gap:8 }}>
                  {Object.entries(MODELOS_DISPONIVEIS).map(([id,label])=>(
                    <button key={id} onClick={()=>setModelo(id)} style={{ background:modelo===id?C.gold+"12":C.card2, border:`1px solid ${modelo===id?C.gold+"60":C.border}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", fontFamily:"inherit", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all 0.15s" }}>
                      <span style={{ fontSize:13, color:modelo===id?C.gold:C.textMid }}>{label}</span>
                      {modelo===id&&<div style={{ width:8, height:8, borderRadius:"50%", background:C.gold }} />}
                    </button>
                  ))}
                </div>
              </div>
              {apiStatus&&(
                <div style={{ marginBottom:16, padding:"12px 16px", background:apiStatus.success?C.successDim:C.accentDim, border:`1px solid ${apiStatus.success?C.success+"50":C.accent+"50"}`, borderRadius:10, fontSize:13, color:apiStatus.success?C.success:C.accent }}>
                  {apiStatus.success?"✅ Conectado com sucesso!":` ❌ ${apiStatus.message}`}
                </div>
              )}
              <button onClick={conectar} style={{ ...btn(false), width:"100%", padding:"14px", fontSize:14 }}>🔌 TESTAR E CONECTAR</button>
              {apiConfigurada&&(
                <div style={{ marginTop:16, padding:"12px 16px", background:C.successDim, border:`1px solid ${C.success}30`, borderRadius:10, fontSize:12, color:C.success, textAlign:"center" }}>
                  ✅ Sistema ativo! Use as abas para gerar conteúdo 🚀
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENT FINDER */}
        {aba==="agent"&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <Badge color={C.purple}>🔍 AGENT FINDER 2.0</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>Produto Vencedor Kalodata</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:6 }}>Score 0-100 · ROI · Path R$10k · Auto-fill produto</div>
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.purple}20`, borderRadius:14, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:11, color:C.purple, letterSpacing:2, marginBottom:10 }}>📋 COMO USAR</div>
              {["1️⃣ Acesse o Kalodata e filtre os produtos","2️⃣ Selecione tudo (Ctrl+A) e copie (Ctrl+C)","3️⃣ Cole aqui embaixo (Ctrl+V)","4️⃣ Clique em Analisar e use o botão 🚀 USAR ESTE PRODUTO"].map((t,i)=>(
                <div key={i} style={{ fontSize:12, color:C.textMid, marginBottom:6 }}>{t}</div>
              ))}
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:20 }}>
              <textarea style={inp({ minHeight:150, resize:"vertical", fontSize:12, fontFamily:"monospace" })} placeholder="Cole os dados do Kalodata aqui — qualquer formato funciona!" value={dadosKalodata} onChange={e=>{setDadosKalodata(e.target.value);setErro(null);}} />
              {dadosKalodata&&<div style={{ marginTop:4, fontSize:10, color:C.textDim }}>{dadosKalodata.length} caracteres</div>}
              {erro&&<div style={{ marginTop:10, padding:"10px 14px", background:C.accentDim, border:`1px solid ${C.accent}40`, borderRadius:8, fontSize:12, color:C.accent }}>⚠️ {erro}</div>}
              <div style={{ display:"flex", gap:12, alignItems:"center", marginTop:14 }}>
                <button onClick={analisarKalodata} disabled={loadingAgent||!dadosKalodata.trim()} style={btn(loadingAgent||!dadosKalodata.trim(), C.purple)}>
                  {loadingAgent?"⟳ Analisando...":"🔍 Analisar Produtos"}
                </button>
                {loadingAgent&&<div style={{ fontSize:11, color:C.textDim }}>Calculando scores e ROI...</div>}
              </div>
            </div>

            {resultadoAgent&&(
              <div>
                {/* RESUMO */}
                <div style={{ background:C.card, border:`1px solid ${C.purple}40`, borderRadius:14, padding:20, marginBottom:20 }}>
                  <div style={{ fontSize:11, color:C.purple, letterSpacing:2, marginBottom:12 }}>📊 RESUMO DA ANÁLISE</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:12 }}>
                    {[
                      ["Total",resultadoAgent.resumo.total_analisados,C.text],
                      ["🏆 Ouro",resultadoAgent.resumo.ouro,"#ffd700"],
                      ["🔥 Cavalo",resultadoAgent.resumo.cavalo,"#ff6b35"],
                      ["💥 Foguete",resultadoAgent.resumo.foguete,C.accent],
                      ["✅ Viável",resultadoAgent.resumo.viavel,C.success],
                      ["🔴 Ignorar",resultadoAgent.resumo.ignorar,C.textDim],
                    ].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{ fontSize:10, color:C.textDim }}>{l}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TOP 3 */}
                <div style={{ background:C.card, border:`2px solid ${C.gold}40`, borderRadius:14, padding:20, marginBottom:20 }}>
                  <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:12 }}>🏆 TOP 3 PRIORIDADES</div>
                  {resultadoAgent.top_3?.map((t,i)=>(
                    <div key={i} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, marginBottom:i<2?10:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ fontSize:18, fontWeight:700, color:C.gold }}>#{t.posicao}</span>
                        <span style={{ fontSize:14, fontWeight:600, marginLeft:10, color:C.text }}>{t.nome}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <div style={{ fontSize:11, color:C.textDim }}>{t.recomendacao}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.success, background:C.successDim, padding:"4px 10px", borderRadius:6 }}>{t.score}/100</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PRODUTOS */}
                {resultadoAgent.produtos?.map((p,i)=>{
                  const corScore = p.score>=90?C.gold:p.score>=75?"#ff6b35":p.score>=60?C.accent:C.textDim;
                  return (
                    <div key={i} style={{ background:C.card, border:`2px solid ${corScore}40`, borderRadius:14, padding:20, marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div>
                          <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{p.classificacao} {p.nome}</div>
                          <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{p.categoria} · R${p.valor}</div>
                        </div>
                        <div style={{ fontSize:28, fontWeight:800, color:corScore, minWidth:50, textAlign:"right" }}>{p.score}</div>
                      </div>

                      <div style={{ fontSize:12, color:C.success, marginBottom:12, fontStyle:"italic" }}>💡 {p.por_que}</div>

                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:12 }}>
                        {[
                          ["Conversão",`${p.conversao}%`,C.success],
                          ["Criadores",p.criadores,C.text],
                          ["Comissão/venda",`R$${p.comissao_por_venda?.toFixed(2)}`,C.gold],
                          ["GMV",p.gmv,C.info],
                        ].map(([l,v,c])=>(
                          <div key={l} style={{ background:C.card2, borderRadius:8, padding:"8px 12px" }}>
                            <div style={{ fontSize:9, color:C.textDim, marginBottom:2 }}>{l}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:c }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ background:C.card2, border:`1px solid ${C.gold}30`, borderRadius:10, padding:12, marginBottom:12 }}>
                        <div style={{ fontSize:9, color:C.gold, letterSpacing:2, marginBottom:4 }}>💰 PATH R$10K</div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{p.path_10k}</div>
                      </div>

                      {p.angulos_matadores?.length>0&&(
                        <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, marginBottom:12 }}>
                          <div style={{ fontSize:9, color:C.purple, letterSpacing:2, marginBottom:8 }}>💡 ÂNGULOS MATADORES</div>
                          {p.angulos_matadores.map((a,ai)=>(
                            <div key={ai} style={{ fontSize:12, color:C.textMid, marginBottom:4 }}>· {a}</div>
                          ))}
                        </div>
                      )}

                      {p.hooks_prontos?.length>0&&(
                        <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, marginBottom:12 }}>
                          <div style={{ fontSize:9, color:C.gold, letterSpacing:2, marginBottom:8 }}>🎣 HOOKS PRONTOS</div>
                          {p.hooks_prontos.map((h,hi)=>(
                            <div key={hi} onClick={()=>onCopy(h,`hook_agent_${i}_${hi}`)} style={{ background:C.gold+"08", border:`1px solid ${copied===`hook_agent_${i}_${hi}`?C.success:C.gold+"20"}`, borderRadius:8, padding:"8px 12px", marginBottom:6, cursor:"pointer", fontSize:13, color:C.text }}>
                              "{h}"
                              <div style={{ fontSize:9, color:copied===`hook_agent_${i}_${hi}`?C.success:C.textDim, marginTop:4 }}>{copied===`hook_agent_${i}_${hi}`?"✓ copiado":"copiar"}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {p.red_flags?.length>0&&(
                        <div style={{ background:C.accentDim, border:`1px solid ${C.accent}30`, borderRadius:10, padding:12, marginBottom:12 }}>
                          <div style={{ fontSize:9, color:C.accent, letterSpacing:2, marginBottom:6 }}>⚠️ RED FLAGS</div>
                          {p.red_flags.map((rf,ri)=>(
                            <div key={ri} style={{ fontSize:12, color:C.accent, marginBottom:2 }}>· {rf}</div>
                          ))}
                        </div>
                      )}

                      <button onClick={()=>usarProduto(p)} style={{ ...btn(false, C.success), width:"100%", fontWeight:700 }}>
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
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <div style={{ marginBottom:24 }}>
              <Badge>📦 PRODUTO</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>Informações do Produto</div>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
              <div style={{ display:"grid", gap:14 }}>
                <input style={inp()} placeholder="Nome do produto" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <input style={inp()} placeholder="Valor (ex: 49.90)" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} />
                  <select style={inp()} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <textarea style={inp({minHeight:90,resize:"vertical"})} placeholder="Descrição (benefícios, diferenciais, público-alvo...)" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} />
                <textarea style={inp({minHeight:100,resize:"vertical",background:"#150a15",border:`2px solid ${form.copyViral?C.accent:C.border}`})} placeholder="📺 COPY VIRAL (opcional) — Cole uma copy que vendeu para modelar a estrutura" value={form.copyViral} onChange={e=>setForm({...form,copyViral:e.target.value})} />
                {form.copyViral&&<div style={{ fontSize:11, color:C.accent, background:C.accentDim, padding:"8px 12px", borderRadius:8, border:`1px solid ${C.accent}30` }}>✨ Copy viral detectada! Estrutura será modelada nas gerações.</div>}
                <textarea style={inp({minHeight:60,resize:"vertical"})} placeholder="Creators/Insights (opcional)" value={form.creators} onChange={e=>setForm({...form,creators:e.target.value})} />
                <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <input type="checkbox" checked={blindador} onChange={e=>setBlindador(e.target.checked)} style={{ width:16, height:16, accentColor:C.gold }} />
                  <span style={{ fontSize:13, color:C.textMid }}>🛡️ Blindador Ultra (6 camadas de proteção)</span>
                </label>
                {erro&&<div style={{ padding:"12px 16px", background:C.accentDim, border:`1px solid ${C.accent}40`, borderRadius:10, fontSize:13, color:C.accent }}>⚠️ {erro}</div>}
                <div style={{ height:1, background:C.border, margin:"4px 0" }} />
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={()=>gerar("hooks")} disabled={loading||!apiConfigurada} style={btn(loading||!apiConfigurada)}>
                    {loading?"⟳ Gerando...":"🎣 Gerar Hooks"}
                  </button>
                  <button onClick={()=>gerar("roteiros")} disabled={loading||!apiConfigurada} style={btn(loading||!apiConfigurada)}>
                    {loading?"⟳ Gerando...":"🎬 Gerar Roteiros"}
                  </button>
                  <button onClick={()=>gerar("coringa")} disabled={loading||!apiConfigurada} style={btn(loading||!apiConfigurada, C.accent)}>
                    {loading?"⟳ Gerando...":"🔥 Gerar Coringa"}
                  </button>
                  <button onClick={gerarMetaAds} disabled={loadingMeta||!apiConfigurada} style={btn(loadingMeta||!apiConfigurada, C.info)}>
                    {loadingMeta?"⟳ Gerando...":"📘 Meta Ads"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* META ADS */}
        {aba==="meta"&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <Badge color={C.info}>📘 META ADS ENGINE</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>5 Hooks que Convertem ($1M testado)</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:6 }}>500+ anúncios testados · Qualquer nicho</div>
            </div>

            {!resultadoMeta&&(
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:20, textAlign:"center" }}>
                {!form.nome||!form.descricao
                  ?<div style={{ color:C.textDim, fontSize:14 }}>Preencha o produto na aba 📦 Produto primeiro</div>
                  :<button onClick={gerarMetaAds} disabled={loadingMeta} style={{ ...btn(loadingMeta, C.info), padding:"14px 32px", fontSize:14 }}>
                    {loadingMeta?"⟳ Gerando 5 hooks...":"📘 Gerar 5 Hooks Meta Ads"}
                  </button>
                }
              </div>
            )}

            {resultadoMeta?.meta_hooks&&(
              <div>
                <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
                  {resultadoMeta.meta_hooks.map((h,i)=>(
                    <button key={i} onClick={()=>setAbaMetaAtiva(i)} style={{ background:abaMetaAtiva===i?C.info+"20":C.card, border:`1px solid ${abaMetaAtiva===i?C.info+"60":C.border}`, borderRadius:10, padding:"8px 14px", cursor:"pointer", fontFamily:"inherit", color:abaMetaAtiva===i?C.info:C.textDim, fontSize:12, fontWeight:abaMetaAtiva===i?700:400, whiteSpace:"nowrap" }}>
                      {i+1}. {h.nome}
                    </button>
                  ))}
                </div>

                {(()=>{
                  const h = resultadoMeta.meta_hooks[abaMetaAtiva];
                  const nivelCor = h.nivel_conversao==="MÁXIMO"?C.accent:h.nivel_conversao==="MUITO ALTO"?C.warning:C.gold;
                  const cor = [C.gold,C.blue,C.purple,C.warning,C.accent][abaMetaAtiva];
                  return (
                    <div style={{ background:C.card, border:`2px solid ${cor}40`, borderRadius:14, padding:24, marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <div>
                          <Badge color={cor}>HOOK {h.numero}</Badge>
                          <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{h.nome}</div>
                        </div>
                        <div style={{ background:nivelCor+"20", border:`1px solid ${nivelCor}40`, borderRadius:20, padding:"6px 14px", fontSize:11, color:nivelCor, fontWeight:700 }}>🔥 {h.nivel_conversao}</div>
                      </div>
                      <CopyBox label="🎯 HOOK PRINCIPAL" content={h.hook_principal} id={`mh${abaMetaAtiva}`} copied={copied} onCopy={onCopy} color={cor} large />
                      <CopyBox label="🎬 SCRIPT COMPLETO" content={h.script_completo} id={`ms${abaMetaAtiva}`} copied={copied} onCopy={onCopy} color={C.success} />
                      {h.variacoes_dor?.length>0&&(
                        <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                          <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>🔄 VARIAÇÕES DE DOR</div>
                          {h.variacoes_dor.map((v,vi)=>(
                            <div key={vi} onClick={()=>onCopy(v,`vd${abaMetaAtiva}${vi}`)} style={{ background:cor+"08", border:`1px solid ${copied===`vd${abaMetaAtiva}${vi}`?C.success:cor+"20"}`, borderRadius:8, padding:"8px 12px", marginBottom:6, cursor:"pointer", fontSize:13, color:C.text }}>
                              {v}
                              <div style={{ fontSize:9, color:copied===`vd${abaMetaAtiva}${vi}`?C.success:C.textDim, marginTop:4 }}>{copied===`vd${abaMetaAtiva}${vi}`?"✓ copiado":"copiar"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {h.instrucao_avatar&&(
                        <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                          <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:6 }}>🎭 INSTRUÇÃO DO AVATAR</div>
                          <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{h.instrucao_avatar}</div>
                        </div>
                      )}
                      <div style={{ display:"grid", gap:8, marginTop:4 }}>
                        <div style={{ fontSize:12, color:C.textMid }}><strong style={{color:C.text}}>Quando usar:</strong> {h.quando_usar}</div>
                        <div style={{ fontSize:12, color:C.textMid }}><strong style={{color:C.text}}>Por que converte:</strong> {h.por_que_converte}</div>
                      </div>
                    </div>
                  );
                })()}

                {resultadoMeta.estrategia_teste&&(
                  <div style={{ background:C.card, border:`1px solid ${C.gold}30`, borderRadius:14, padding:20 }}>
                    <Badge>⚡ ESTRATÉGIA DE TESTE</Badge>
                    <div style={{ display:"grid", gap:8 }}>
                      {[["Ordem","ordem_teste"],["Volume","volume_por_hook"],["Escala","como_escalar"],["Dica crítica","dica_critica"]].map(([k,key])=>(
                        <div key={k} style={{ fontSize:12, color:C.textMid }}><strong style={{color:C.gold}}>{k}:</strong> {resultadoMeta.estrategia_teste[key]}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop:16, textAlign:"center" }}>
                  <button onClick={gerarMetaAds} disabled={loadingMeta} style={btn(loadingMeta, C.info)}>
                    {loadingMeta?"⟳ Gerando...":"🔄 Regenerar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOOKS */}
        {aba==="hooks"&&(
          <div>
            <div style={{ marginBottom:20 }}>
              <Badge>🎣 POV HOOKS</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>5 Padrões Científicos</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>Testados com $1M em ad spend</div>
            </div>
            {resultado&&tipoAtual==="hooks"&&resultado.pov_hooks
              ?resultado.pov_hooks.map((h,i)=>{
                const cores=[C.gold,C.accent,C.purple,C.blue,"#10b981"];
                const cor=cores[i%cores.length];
                return (
                  <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
                    <Badge color={cor}>PADRÃO {i+1}</Badge>
                    <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:12 }}>{h.padrao}</div>
                    <CopyBox label="📱 HOOK" content={h.hook} id={`h${i}`} copied={copied} onCopy={onCopy} color={cor} large />
                    <div style={{ display:"grid", gap:8 }}>
                      {[["Estrutura",h.estrutura],["Por que funciona",h.por_que_funciona],["Quando usar",h.quando_usar],["Variação",h.exemplo_variacao]].map(([k,v])=>(
                        <div key={k} style={{ fontSize:12, color:C.textMid }}><strong style={{color:C.text}}>{k}:</strong> {v}</div>
                      ))}
                    </div>
                  </div>
                );
              })
              :<EmptyState icon="🎣" title="Nenhum hook gerado ainda" sub="Vá em 📦 Produto e clique em Gerar Hooks" />
            }
          </div>
        )}

        {/* ROTEIROS */}
        {aba==="roteiros"&&(
          <div>
            <div style={{ marginBottom:20 }}>
              <Badge>🎬 VILLAIN VS HERO</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>Roteiros Estruturados</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>3 roteiros · máx 30 palavras · carrinho laranja</div>
            </div>
            {resultado&&tipoAtual==="roteiros"&&resultado.roteiros_villain_hero
              ?resultado.roteiros_villain_hero.map((r,i)=>{
                const palavras=(r.roteiro_narrado||"").split(" ").filter(Boolean).length;
                return (
                  <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div><Badge>ROTEIRO {r.numero}</Badge><div style={{ fontSize:16, fontWeight:700, color:C.text }}>Villain vs Hero</div></div>
                      <div style={{ fontSize:11, color:C.gold, background:C.goldDim, padding:"4px 12px", borderRadius:20, border:`1px solid ${C.gold}30` }}>{r.duracao_estimada}</div>
                    </div>
                    <CopyBox label="📱 POV HOOK" content={r.pov_hook} id={`rp${i}`} copied={copied} onCopy={onCopy} color={C.gold} large />
                    <CopyBox label={`🎙️ ROTEIRO · ${palavras} PALAVRAS`} content={r.roteiro_narrado} id={`rn${i}`} copied={copied} onCopy={onCopy} color={C.success} />
                    <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                      <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>ESTRUTURA</div>
                      {[["👿 Villain",r.villain,C.warning],["🦸 Hero",r.hero,C.success],["✓ Proof",r.proof,C.info]].map(([l,v,c])=>(
                        <div key={l} style={{ marginBottom:8, fontSize:12 }}><strong style={{color:c}}>{l}:</strong> <span style={{color:C.textMid}}>{v}</span></div>
                      ))}
                    </div>
                    <CopyBox label="📋 LEGENDA SEO" content={r.legenda_seo} id={`rl${i}`} copied={copied} onCopy={onCopy} color={C.warning} />
                    <CopyBox label="# HASHTAGS (5)" content={r.hashtags?.join(" ")} id={`rh${i}`} copied={copied} onCopy={onCopy} color={C.info} />
                    <div style={{ fontSize:11, color:C.textDim }}><strong style={{color:C.textMid}}>Quando usar:</strong> {r.quando_usar}</div>
                  </div>
                );
              })
              :<EmptyState icon="🎬" title="Nenhum roteiro gerado ainda" sub="Vá em 📦 Produto e clique em Gerar Roteiros" />
            }
          </div>
        )}

        {/* CORINGA */}
        {aba==="coringa"&&(
          <div>
            <div style={{ marginBottom:20 }}>
              <Badge color={C.accent}>🔥 FORMATO CORINGA</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>10 Variações Virais</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>214k+ views · POV format</div>
            </div>
            {resultado&&tipoAtual==="coringa"&&resultado.formato_coringa
              ?resultado.formato_coringa.map((c,i)=>(
                <div key={i} style={{ background:C.card, border:`1px solid ${C.accent}30`, borderRadius:14, padding:20, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <Badge color={C.accent}>VARIAÇÃO {c.variacao}</Badge>
                    <div style={{ fontSize:10, color:C.textDim }}>{c.quando_usar}</div>
                  </div>
                  <CopyBox label="🔥 TEXTO" content={c.texto} id={`co${i}`} copied={copied} onCopy={onCopy} color={C.accent} />
                  <div style={{ fontSize:11, color:C.textDim }}><strong style={{color:C.textMid}}>Estrutura:</strong> {c.estrutura}</div>
                </div>
              ))
              :<EmptyState icon="🔥" title="Nenhuma variação gerada ainda" sub="Vá em 📦 Produto e clique em Gerar Coringa" />
            }
          </div>
        )}

        {/* ESCALA */}
        {aba==="escala"&&(
          <div>
            <div style={{ marginBottom:20 }}>
              <Badge color={C.info}>🚀 ESCALA CIENTÍFICA</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>Multiplica Scripts Vencedores</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>CBO: testa 100 → 10 vendem → 3 explodem</div>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:24 }}>
              <div style={{ fontSize:11, color:C.textDim, letterSpacing:2, marginBottom:10 }}>SCRIPT VENCEDOR</div>
              <textarea style={inp({minHeight:110,resize:"vertical"})} placeholder="Cole o script vencedor aqui..." value={scriptVencedor} onChange={e=>{setScriptVencedor(e.target.value);setErro(null);}} />
              <div style={{ display:"flex", gap:10, marginTop:14, marginBottom:14 }}>
                {[10,20,50].map(n=>(
                  <button key={n} onClick={()=>setNumVariacoes(n)} style={{ background:numVariacoes===n?C.goldDim:C.card2, border:`1px solid ${numVariacoes===n?C.gold+"60":C.border}`, borderRadius:10, padding:"10px 20px", color:numVariacoes===n?C.gold:C.textDim, fontSize:14, fontWeight:numVariacoes===n?700:400, cursor:"pointer", fontFamily:"inherit" }}>
                    {n}{n===20?" ✨":""}
                  </button>
                ))}
              </div>
              {erro&&<div style={{ marginBottom:14, padding:"12px 16px", background:C.accentDim, border:`1px solid ${C.accent}40`, borderRadius:10, fontSize:13, color:C.accent }}>⚠️ {erro}</div>}
              <button onClick={gerarEscala} disabled={loadingEscala||!scriptVencedor.trim()||!apiConfigurada} style={btn(loadingEscala||!scriptVencedor.trim()||!apiConfigurada)}>
                {loadingEscala?"⟳ Gerando...":`🚀 Gerar ${numVariacoes} Variações`}
              </button>
            </div>

            {resultadoEscala&&(
              <div>
                {resultadoEscala.analise&&(
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
                    <Badge>📊 ANÁLISE DO SCRIPT</Badge>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:4 }}>
                      {[["Padrão",resultadoEscala.analise.padrao_detectado],["Tom",resultadoEscala.analise.tom_emocional],["Estrutura",resultadoEscala.analise.estrutura],["Palavras",resultadoEscala.analise.duracao_palavras]].map(([k,v])=>(
                        <div key={k} style={{ background:C.card2, borderRadius:8, padding:"8px 12px" }}>
                          <div style={{ fontSize:9, color:C.textDim, marginBottom:2 }}>{k}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:C.gold }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize:11, color:C.textDim, letterSpacing:2, marginBottom:16 }}>{resultadoEscala.variacoes?.length} VARIAÇÕES GERADAS</div>
                {resultadoEscala.variacoes?.map((v,i)=>{
                  const palavras=(v.roteiro_narrado||"").split(" ").filter(Boolean).length;
                  return (
                    <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <Badge>VAR {v.numero}</Badge>
                        <span style={{ fontSize:10, color:C.warning, background:C.warning+"20", padding:"3px 10px", borderRadius:20, border:`1px solid ${C.warning}30` }}>{v.tipo_variacao}</span>
                      </div>
                      <CopyBox label="📱 HOOK" content={v.pov_hook} id={`ep${i}`} copied={copied} onCopy={onCopy} color={C.gold} large />
                      <CopyBox label={`🎙️ ROTEIRO · ${palavras} PALAVRAS`} content={v.roteiro_narrado} id={`er${i}`} copied={copied} onCopy={onCopy} color={C.success} />
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <CopyBox label="📋 LEGENDA" content={v.legenda_seo} id={`el${i}`} copied={copied} onCopy={onCopy} color={C.warning} />
                        <CopyBox label="# HASHTAGS" content={v.hashtags?.join(" ")} id={`eh${i}`} copied={copied} onCopy={onCopy} color={C.info} />
                      </div>
                      <div style={{ fontSize:10, color:C.textDim, marginTop:4 }}>💡 <strong style={{color:C.textMid}}>Mudança:</strong> {v.o_que_mudou}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SHIELD */}
        {aba==="shield"&&(
          <div>
            <div style={{ marginBottom:24 }}>
              <Badge color={C.success}>🛡️ SHIELD</Badge>
              <div style={{ fontSize:22, fontWeight:800, color:C.text }}>Scanner de Compliance</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:6 }}>Detecta violações · Score 0-100 · Texto corrigido automaticamente</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              {[{cor:C.success,nivel:"🟢 VERDE",desc:"Score 80-100\nSeguro para postar"},{cor:C.warning,nivel:"🟡 AMARELO",desc:"Score 60-79\nAjuste necessário"},{cor:C.accent,nivel:"🔴 VERMELHO",desc:"Score 0-59\nRisco de ban"}].map(({cor,nivel,desc})=>(
                <div key={nivel} style={{ background:cor+"10", border:`1px solid ${cor}30`, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:cor, marginBottom:4 }}>{nivel}</div>
                  <div style={{ fontSize:10, color:C.textDim, whiteSpace:"pre-line", lineHeight:1.5 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:20 }}>
              <textarea style={inp({minHeight:140,resize:"vertical"})} placeholder="Cole hook, roteiro, legenda ou qualquer texto que vai postar..." value={textoShield} onChange={e=>{setTextoShield(e.target.value);setErro(null);setResultadoShield(null);}} />
              {textoShield&&<div style={{ marginTop:4, fontSize:10, color:C.textDim }}>{textoShield.split(" ").filter(Boolean).length} palavras</div>}
              {erro&&<div style={{ marginTop:10, padding:"10px 14px", background:C.accentDim, border:`1px solid ${C.accent}40`, borderRadius:8, fontSize:12, color:C.accent }}>⚠️ {erro}</div>}
              <button onClick={analisarShield} disabled={loadingShield||!textoShield.trim()} style={{ ...btn(loadingShield||!textoShield.trim(), C.success), marginTop:14 }}>
                {loadingShield?"⟳ Analisando...":"🛡️ Analisar Compliance"}
              </button>
            </div>

            {resultadoShield&&(
              <div>
                <div style={{ background:C.card, border:`2px solid ${corRiscoShield}40`, borderRadius:16, padding:24, marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:20 }}>
                    <div>
                      <div style={{ fontSize:11, color:C.textDim, letterSpacing:2, marginBottom:8 }}>SCORE DE SEGURANÇA</div>
                      <div style={{ fontSize:36, fontWeight:800, color:scoreColorShield }}>{resultadoShield.score_seguranca}/100</div>
                      <div style={{ fontSize:14, color:corRiscoShield, fontWeight:600, marginTop:4 }}>
                        {resultadoShield.nivel_risco==="VERDE"?"🟢 APROVADO":resultadoShield.nivel_risco==="AMARELO"?"🟡 ATENÇÃO":"🔴 REPROVADO"} · {resultadoShield.nivel_risco}
                      </div>
                    </div>
                    <div style={{ flex:1, minWidth:180 }}>
                      <div style={{ height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${resultadoShield.score_seguranca}%`, background:`linear-gradient(90deg,${scoreColorShield},${scoreColorShield}99)`, borderRadius:4, transition:"width 0.5s" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9, color:C.textDim }}>
                        <span>0 BAN</span><span>60</span><span>80 SEGURO</span><span>100</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:C.textMid, lineHeight:1.7, padding:"12px 16px", background:C.card2, borderRadius:10 }}>{resultadoShield.resumo}</div>
                </div>

                {resultadoShield.violacoes?.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, color:C.accent, letterSpacing:2, marginBottom:12 }}>❌ {resultadoShield.violacoes.length} VIOLAÇÃO(ÕES) DETECTADA(S)</div>
                    {resultadoShield.violacoes.map((v,i)=>(
                      <div key={i} style={{ background:C.card, border:`1px solid ${v.gravidade==="ALTA"?C.accent:v.gravidade==="MÉDIA"?C.warning:C.border}30`, borderRadius:12, padding:16, marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:v.gravidade==="ALTA"?C.accent:v.gravidade==="MÉDIA"?C.warning:C.textMid }}>
                            {v.gravidade==="ALTA"?"🔴":v.gravidade==="MÉDIA"?"🟡":"🟢"} {v.tipo}
                          </div>
                          <span style={{ fontSize:9, color:v.gravidade==="ALTA"?C.accent:C.warning, background:(v.gravidade==="ALTA"?C.accent:C.warning)+"15", padding:"2px 8px", borderRadius:10 }}>{v.gravidade}</span>
                        </div>
                        {v.trecho&&<div style={{ fontSize:12, color:C.accent, background:C.accentDim, padding:"6px 10px", borderRadius:6, marginBottom:8, fontStyle:"italic" }}>"{v.trecho}"</div>}
                        <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}><strong style={{color:C.textMid}}>Motivo:</strong> {v.motivo}</div>
                        <div style={{ fontSize:12, color:C.success }}><strong>✅ Sugestão:</strong> {v.sugestao}</div>
                      </div>
                    ))}
                  </div>
                )}

                {resultadoShield.pontos_positivos?.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, color:C.success, letterSpacing:2, marginBottom:10 }}>✅ PONTOS POSITIVOS</div>
                    <div style={{ background:C.card, border:`1px solid ${C.success}20`, borderRadius:12, padding:16 }}>
                      {resultadoShield.pontos_positivos.map((p,i)=>(
                        <div key={i} style={{ fontSize:12, color:C.textMid, marginBottom:6, display:"flex", gap:8 }}>
                          <span style={{color:C.success}}>✓</span> {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultadoShield.texto_corrigido&&(
                  <div style={{ background:C.card, border:`1px solid ${C.success}30`, borderRadius:14, overflow:"hidden" }}>
                    <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:11, color:C.success, letterSpacing:2, marginBottom:2 }}>✨ TEXTO CORRIGIDO</div>
                        <div style={{ fontSize:11, color:C.textDim }}>Versão segura pronta para postar</div>
                      </div>
                      <button onClick={()=>onCopy(resultadoShield.texto_corrigido,"shield_corrigido")} style={{ background:copied==="shield_corrigido"?C.successDim:C.goldDim, border:`1px solid ${copied==="shield_corrigido"?C.success:C.gold}50`, borderRadius:8, padding:"8px 14px", color:copied==="shield_corrigido"?C.success:C.gold, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        {copied==="shield_corrigido"?"✓ Copiado!":"📋 Copiar"}
                      </button>
                    </div>
                    <div style={{ padding:18, fontSize:14, color:C.text, lineHeight:1.8, background:C.success+"08" }}>{resultadoShield.texto_corrigido}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:"24px 20px", textAlign:"center", marginTop:40 }}>
        <div style={{ fontSize:9, letterSpacing:5, color:C.gold, marginBottom:6 }}>🔥 TIKTOK SHOP GENERATOR SUPREME</div>
        <div style={{ fontSize:11, color:C.textDim }}>OpenRouter · Agent Finder · Meta Ads · Shield · Copy Viral · Escala Científica · 6 Camadas</div>
      </div>

      <style>{`
        * { box-sizing:border-box; }
        body { margin:0; background:${C.bg}; }
        select option { background:#0d0d0d; color:#f0e8d8; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }
        input::placeholder, textarea::placeholder { color:#444; }
      `}</style>
    </div>
  );
}