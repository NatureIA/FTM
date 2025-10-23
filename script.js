function alternar(btn) {
  btn.classList.toggle("ativo");
  btn.textContent = btn.classList.contains("ativo") ? "Sim" : "Não";
}

function alternarModo() {
  const modo = document.getElementById("modoDistancia").value;
  document.getElementById("entradaDistancia").style.display = (modo === "km") ? "block" : "none";
  document.getElementById("entradaCidade").style.display = (modo === "cidade") ? "block" : "none";
  document.getElementById("entradaCoord").style.display = (modo === "coordenada") ? "block" : "none";
}

// Distância entre coordenadas (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Exemplo de tabela CCD e CC simplificada (valores fictícios)
const tabela = {
  "Carga Geral": {2:[3.20, 250],3:[3.50,300],4:[3.80,350],5:[4.10,400],6:[4.40,450],7:[4.70,500],8:[5.00,550],9:[5.30,600]},
  "Granel sólido": {2:[2.90,200],3:[3.10,250],4:[3.30,300],5:[3.50,350],6:[3.70,400],7:[3.90,450],8:[4.10,500],9:[4.30,550]}
};

async function calcularFrete() {
  const tipo = document.getElementById("tipoCarga").value;
  const eixos = parseInt(document.getElementById("numEixos").value);
  const modo = document.getElementById("modoDistancia").value;
  let distancia = 0;

  if (modo === "km") {
    distancia = parseFloat(document.getElementById("distanciaKm").value);
  } else if (modo === "coordenada") {
    const lat1 = parseFloat(document.getElementById("lat1").value);
    const lon1 = parseFloat(document.getElementById("lon1").value);
    const lat2 = parseFloat(document.getElementById("lat2").value);
    const lon2 = parseFloat(document.getElementById("lon2").value);
    distancia = calcularDistancia(lat1, lon1, lat2, lon2);
  } else if (modo === "cidade") {
    const origem = document.getElementById("origem").value;
    const destino = document.getElementById("destino").value;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origem)}&limit=1`;
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
    const [res1, res2] = await Promise.all([fetch(url), fetch(url2)]);
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
    if (data1[0] && data2[0]) {
      distancia = calcularDistancia(+data1[0].lat, +data1[0].lon, +data2[0].lat, +data2[0].lon);
    } else {
      alert("Não foi possível encontrar as cidades informadas.");
      return;
    }
  }

  if (!tipo || !eixos || isNaN(distancia) || distancia <= 0) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  const [ccd, cc] = tabela[tipo]?.[eixos] || [3.0, 300];
  let frete = (distancia * ccd) + cc;

  if (document.getElementById("compBtn").classList.contains("ativo")) frete *= 1.05;
  if (document.getElementById("altoBtn").classList.contains("ativo")) frete *= 0.95;
  if (document.getElementById("retornoBtn").classList.contains("ativo")) frete *= 1.10;

  document.getElementById("resultado").innerHTML =
    `🟩 Frete mínimo estimado: <br><strong>R$ ${frete.toFixed(2).replace('.', ',')}</strong><br>
     (${distancia.toFixed(1)} km calculados)`;
}
