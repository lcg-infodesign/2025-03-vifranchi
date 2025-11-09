let volcanoData;
let worldMap;
let cols = 250;
let rows = 130;
let zoom = 1;
let mapOffsetY = 100; //regola spostamento della mappa sul canvas

// gestiscono la variazione del colore
let globalMinElevation = 0;
let globalMaxElevation = 1000;

//contiene le coordinate grafiche per gestire il tooltip
let volcanoPositions = []; 

//permettono di accedere ai dati in modo leggibile
let COLS = {
  name: 'Volcano Name',
  country: 'Country',
  location: 'Location',
  lat: 'Latitude',
  lon: 'Longitude',
  elev: 'Elevation',
  type: 'Type',
  status: 'Status',
  last: 'Last Known Eruption',
  category: 'TypeCategory'
};


function preload() {
  worldMap = loadImage("worldMap.jpg");
  volcanoData = loadTable('volcanoes.csv', 'csv', 'header');
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica');
  redraw(); //forma il primo disegno in modo che la funzione 
            // tooltip funzioni da subito (WE HOPE)
}

function draw() {
  background('#C9C1B1');

  textAlign(CENTER, CENTER);
  textSize(40);
  textStyle(BOLD);
  fill('#1B2632');
  text("MAPPA DEI VULCANI NEL MONDO", width / 2, 40);

  drawWorldMap(); //disegna mappa con i vulcani
  drawCoordinates(); // disegna legenda
  drawHoverTooltip(); // mostra il tooltip se il mouse è sopra un vulcano
}


//
// MAPPA E VULCANI
//
function drawWorldMap() {
  
  worldMap.resize(cols, rows); // ridimensiona l'immagine di base alla griglia (non al canvas intero)
  worldMap.loadPixels(); //carica i pixel dell'immagine in memoria per poterli leggere

  // !!!calcola dove e quanto grande ridisegnare la mappa post zoom
  let marginX = 50; 
  let mapWidth = width * zoom - 2 * marginX; 
  let mapHeight = (height - 150) * zoom; 
  let cellWidth = mapWidth / cols;
  let cellHeight = mapHeight / rows;
  let offsetX = marginX;
  let offsetY = mapOffsetY + (height - mapHeight - mapOffsetY) / 2;

  // scorre il CSV e trova i valori min e max di elevazione per la scala cromatica
  volcanoPositions = [];
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  if (volcanoData) {
    for (let i = 0; i < volcanoData.getRowCount(); i++) {
      let elevStr = volcanoData.getString(i, 'Elevation');
      let elevation = (elevStr === "" || elevStr === undefined) ? NaN : float(elevStr);
      if (!isNaN(elevation)) {
        if (elevation < minElevation) minElevation = elevation;
        if (elevation > maxElevation) maxElevation = elevation;
      }
    }
    if (minElevation === Infinity) minElevation = 0;
    if (maxElevation === -Infinity) maxElevation = 1000;

    // aggiorna variabili per la legenda
    globalMinElevation = floor(minElevation);
    globalMaxElevation = ceil(maxElevation);

    // riempie la mappa delle celle con i vulcani
    // salva anche le posizioni per il tooltip
    for (let i = 0; i < volcanoData.getRowCount(); i++) {
      let lat = parseFloat(volcanoData.getString(i, 'Latitude'));
      let lon = parseFloat(volcanoData.getString(i, 'Longitude'));
      let elev = parseFloat(volcanoData.getString(i, 'Elevation'));

      if (isNaN(lat) || isNaN(lon)) continue;

      //coordinate geografiche (lon/lat) in coordinate della griglia (pixel)
      let gridX = floor(map(lon, -180, 180, 0, cols));
      let gridY = floor(map(lat, 90, -90, 0, rows));
      gridX = constrain(gridX, 0, cols - 1);
      gridY = constrain(gridY, 0, rows - 1);

      //salvate per essere usate dopo dal tooltip
      volcanoPositions.push({
        x: offsetX + gridX * cellWidth,
        y: offsetY + gridY * cellHeight,
        w: cellWidth,
        h: cellHeight,
        index: i
      });
    }
  } else {
    // default legenda se non ci sono dati
    globalMinElevation = 0;
    globalMaxElevation = 1000;
  }

  let lowColor = color('#ffdd80ff');
  let highColor = color('#85250fff');

  noStroke();

  //PER OGNI CELLA, CONTROLLA SE CI SONO VULCANI E IN CASO LI COLORA
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // (controlla volcanoPositions)
      let hasVolcano = false;
      let elevForColor = null;
      for (let vp of volcanoPositions) {
        let gx = floor((vp.x - 50) / (mapWidth / cols)); // usa marginX fisso 
        let gy = floor((vp.y - offsetY) / (mapHeight / rows));
        if (gx === x && gy === y) {
          hasVolcano = true;
          elevForColor = parseFloat(volcanoData.getString(vp.index, 'Elevation'));
          break;
        }
      }

      if (hasVolcano && !isNaN(elevForColor)) {
        let t = (globalMaxElevation !== globalMinElevation)
          ? map(elevForColor, globalMinElevation, globalMaxElevation, 0, 1)
          : 0.5;
        t = constrain(t, 0, 1);
        fill(lerpColor(lowColor, highColor, t));
      } else {
        // colore di sfondo basato sulla mappa
        let index = (x + y * worldMap.width) * 4;
        let r = worldMap.pixels[index];
        fill(r < 128 ? '#1B2632' : '#C9C1B1');
      }

      rect(offsetX + x * cellWidth, offsetY + y * cellHeight, cellWidth, cellHeight);
    }
  }
}


//
//LEGENDA
//
function drawCoordinates() {
  let boxX = 20;
  let boxWidth = 280;

  let legendBoxHeight = 120;
  let legendBoxY = height - legendBoxHeight - 20;

  fill('#EEE9DF');
  noStroke();
  rect(boxX, legendBoxY, boxWidth, legendBoxHeight);

  fill('#1B2632');
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("LEGENDA", boxX + 15, legendBoxY + 15);

  let scaleX = boxX + 30;
  let scaleY = legendBoxY + 70;
  let scaleWidth = 150;
  let scaleHeight = 15;

  let lowColor = color('#ffdd80ff');
  let highColor = color('#85250fff');

  for (let i = 0; i <= scaleWidth; i++) {
    let t = i / scaleWidth;
    let col = lerpColor(lowColor, highColor, t);
    stroke(col);
    line(scaleX + i, scaleY, scaleX + i, scaleY + scaleHeight);
  }

  noStroke();
  fill('#1B2632');
  textSize(12);
  textStyle(NORMAL);
  textAlign(CENTER, BOTTOM);
  text(globalMinElevation + " m", scaleX, scaleY - 5);
  text(globalMaxElevation + " m", scaleX + scaleWidth, scaleY - 5);
  textAlign(LEFT, CENTER);
  text("Altitudine vulcani", scaleX, scaleY - 25);

  let zoomBoxHeight = 80;
  let zoomBoxY = legendBoxY - zoomBoxHeight - 15;

  fill('#EEE9DF');
  noStroke();
  rect(boxX, zoomBoxY, boxWidth, zoomBoxHeight);

  fill('#1B2632');
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("ZOOM", boxX + 15, zoomBoxY + 15);

  textStyle(NORMAL);
  textSize(14);
  text("+ per ingrandire", boxX + 15, zoomBoxY + 40);
  text("- per ridurre", boxX + 15, zoomBoxY + 60);
}

//
// TOOLTIP
//
function drawHoverTooltip() {
  if (!volcanoData || volcanoPositions.length === 0) return;

  // la prima cella che contiene il mouse (dal più recente alla prima)
  let hover = null;
  for (let i = volcanoPositions.length - 1; i >= 0; i--) {
    let v = volcanoPositions[i];
    //controlla se il mouse si trova sopra una cella con un vulcano
    if (mouseX > v.x && mouseX < v.x + v.w && mouseY > v.y && mouseY < v.y + v.h) {
      hover = v;
      break;
    }
  }
  
  //in caso disegna un piccolo riquadro con le varie info
  if (hover) {
    let idx = hover.index;
    let name = volcanoData.getString(idx, 'Volcano Name') || "—";
    let location = volcanoData.getString(idx, 'Location') || "—";
    let country = volcanoData.getString(idx, 'Country') || "—";
    let typeCat = volcanoData.getString(idx, 'TypeCategory') || "—";

    let lines = [
      name,
      "Località: " + location,
      "Paese: " + country,
      "Categoria: " + typeCat
    ];

    let w = 0;
    textSize(11);
    for (let l of lines) w = max(w, textWidth(l));

    let bx = mouseX + 15;
    let by = mouseY + 15;
    let h = lines.length * 16 + 10;

    if (bx + w + 20 > width) bx = mouseX - w - 30;
    if (by + h > height) by = mouseY - h - 10;

    push();
    fill('#2c3b4da4');
    noStroke();
    rect(bx, by, w + 20, h);
    noStroke();
    fill('#EEE9DF');
    textAlign(LEFT, TOP);
    let ty = by + 8;
    for (let l of lines) {
      text(l, bx + 10, ty);
      ty += 16;
    }
    pop();
  }
}

//
//PERMETTE FUNZIONAMENTO ZOOM
//
function keyPressed() {
  if (key === '+') {
    zoom = min(zoom + 0.1, 5);
    redraw();
  } else if (key === '-' || key === '_') {
    zoom = max(zoom - 0.1, 0.5);
    redraw();
  }
}

//
// aggiorna la mappa se la finestra del browser cambia dimensione
//
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}

// IMPORTANTISSIMO!!! ridisegna quando il mouse si muove così il tooltip segue
function mouseMoved() {
  redraw();
}
function mouseDragged() {
  redraw();
}
function touchMoved() {
  redraw();
}

