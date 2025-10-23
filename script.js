// ====== Estado ======
let COEF = null; // carregado de antt.json (CCD/CC por tipo/eixo/tabela)

// ====== Util ======
function alternar(btn){
  btn.classList.toggle('ativo');
  btn.textContent = btn.classList.contains('ativo') ? 'Sim' : 'Não';
}
function alternarModo(){
  const modo = document.getElementById('modoDistancia').value;
  document.getElementById('entradaDistancia').classList.toggle('hide', modo!=='km');
  document.getElementById('entradaCidade').classList.toggle('hide', modo!=='cidade');
  document.getElementById('entradaCoord').classList.toggle('hide', modo!=='coordenada');
}
// Haversine (km)
function distHaversine(lat1,lon1,lat2,lon2){
  const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
// Geocodificação OSM
async function geocode(q){
  const url=`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const r=await fetch(url,{headers:{'Accept-Language':'pt-BR'}});
  if(!r.ok) throw new Error('Falha na geocodificação');
  const j=await r.json();
  if(!j[0]) throw new Error('Local não encontrado');
  return {lat:+j[0].lat, lon:+j[0].lon};
}

// ====== Núcleo do cálculo ======
async function calcularFrete(){
  const tipo=document.getElementById('tipoCarga').value;
  const eixos=parseInt(document.getElementById('numEixos').value||'0',10);
  const tabela=document.getElementById('tabela').value;
  const modo=document.getElementById('modoDistancia').value;

  if(!tipo||!eixos||!tabela){ alert('Preencha tipo, eixos e tabela.'); return; }

  let distancia=0;
  if(modo==='km'){
    distancia=parseFloat(document.getElementById('distanciaKm').value);
  }else if(modo==='cidade'){
    const o=document.getElementById('origem').value;
    const d=document.getElementById('destino').value;
    try{
      const [O,D]=await Promise.all([geocode(o),geocode(d)]);
      distancia=distHaversine(O.lat,O.lon,D.lat,D.lon);
    }catch(e){ alert('Não foi possível obter as coordenadas: '+e.message); return; }
  }else{
    const lat1=parseFloat(document.getElementById('lat1').value);
    const lon1=parseFloat(document.getElementById('lon1').value);
    const lat2=parseFloat(document.getElementById('lat2').value);
    const lon2=parseFloat(document.getElementById('lon2').value);
    distancia=distHaversine(lat1,lon1,lat2,lon2);
  }
  if(!(distancia>0)){ alert('Informe uma distância válida.'); return; }

  // Localiza coeficiente. Se eixo exato não existir, pega imediatamente inferior, senão o superior.
  const registro = COEF?.[tabela]?.[tipo];
  if(!registro){ alert('Não há coeficientes para essa combinação (tabela/tipo).'); return; }

  let eixoUsado = eixos;
  while(!registro[eixoUsado] && eixoUsado>2) eixoUsado--; // inferior
  if(!registro[eixoUsado]){
    eixoUsado=eixos+1; while(!registro[eixoUsado] && eixoUsado<=9) eixoUsado++; // superior
    if(!registro[eixoUsado]){ alert('Sem coeficientes compatíveis para eixos.'); return; }
  }

  const { CCD, CC } = registro[eixoUsado]; // R$/km e R$
  let freteIda = distancia * CCD + CC;

  // Ajustes (as tabelas já incorporam o cenário de contratação; aqui só flags visuais)
  const comp   = document.getElementById('compBtn').classList.contains('ativo'); // informativo
  const alto   = document.getElementById('altoBtn').classList.contains('ativo'); // informativo
  const retVaz = document.getElementById('retornoBtn').classList.contains('ativo');

  const valorRetorno = retVaz ? 0.92 * distancia * CCD : 0;

  const total = freteIda + valorRetorno;

  // Saída
  document.getElementById('resultado').innerHTML =
    `R$ ${total.toFixed(2).replace('.',',')}`;

  const detalhes = `
    <div><b>Operação:</b> Tabela ${tabela}</div>
    <div><b>Tipo de carga:</b> ${tipo}</div>
    <div><b>Eixos usados:</b> ${eixoUsado}${eixoUsado!==eixos?' (ajuste por regra de eixos)':''}</div>
    <div><b>Distância:</b> ${distancia.toFixed(1)} km</div>
    <div><b>CCD:</b> ${CCD.toFixed(4).toString().replace('.',',')} R$/km</div>
    <div><b>CC:</b> ${CC.toFixed(2).toString().replace('.',',')} R$</div>
    <div><b>Valor de ida:</b> R$ ${(freteIda).toFixed(2).replace('.',',')}</div>
    <div><b>Retorno vazio:</b> ${retVaz?('R$ '+valorRetorno.toFixed(2).replace('.',',')):'0,00'}</div>
    <div><b>Total (ida${retVaz?'+ retorno':''}):</b> R$ ${total.toFixed(2).replace('.',',')}</div>
    <hr/>
    <small>${comp?'✓ ':'✗ '}Composição veicular | ${alto?'✓ ':'✗ '}Alto desempenho | ${retVaz?'✓ ':'✗ '}Retorno vazio</small>
  `;
  document.getElementById('detalhes').innerHTML = detalhes;
}

// ====== Boot ======
alternarModo();
fetch('antt.json')
  .then(r => r.json())
  .then(j => { COEF=j; })
  .catch(() => alert('Falha ao carregar coeficientes (antt.json).'));
