const NNVisualiser = (() => {
  const config = {
    nodeRadius: 24,
    svgWidth: 700,
    svgHeight: 360,
    svgPaddingX: 60,
    svgPaddingY: 80,
    activationFn: (x) => 1 / (1 + Math.exp(-x)),
  };

  let layers = [1, 3, 3, 1]; // controls the number of nodes in each layer and the number of layers in the network. format: [input, hidden1, hidden2, ..., output]
  let weights = [];
  let biases = [];
  let activations = [];
  let inputs = [0.5]; // default input values, will be trimmed or extended based on num-inputs

  function randomWeight() {
    return parseFloat((Math.random() * 2 - 1).toFixed(3));
  }

  function initNetwork() {
    weights = [];
    biases = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const layerWeights = [];
      for (let i = 0; i < layers[l + 1]; i++) {
        const nodeWeights = [];
        for (let j = 0; j < layers[l]; j++) {
          nodeWeights.push(randomWeight());
        }
        layerWeights.push(nodeWeights);
      }
      weights.push(layerWeights);

      const layerBiases = [];
      for (let i = 0; i < layers[l + 1]; i++) {
        layerBiases.push(randomWeight());
      }
      biases.push(layerBiases);
    }
    forwardPass();
  }

  function forwardPass() {
    activations = [inputs.map((x) => parseFloat(x))];
    for (let l = 0; l < weights.length; l++) {
      const layerActivations = [];
      for (let i = 0; i < layers[l + 1]; i++) {
        let z = biases[l][i];
        for (let j = 0; j < layers[l]; j++) {
          z += weights[l][i][j] * activations[l][j];
        }
        layerActivations.push(config.activationFn(z));
      }
      activations.push(layerActivations);
    }
  }

  function getNodePositions() {
    const usableW = config.svgWidth - 2 * config.svgPaddingX;
    const usableH = config.svgHeight - 2 * config.svgPaddingY;
    const layerSpacing = usableW / (layers.length - 1);

    const positions = [];
    for (let l = 0; l < layers.length; l++) {
      const layerPositions = [];
      const nodeSpacing = usableH / (layers[l] > 1 ? layers[l] - 1 : 1);
      const offsetY = layers[l] === 1 ? usableH / 2 : 0;
      for (let n = 0; n < layers[l]; n++) {
        layerPositions.push({
          x: config.svgPaddingX + l * layerSpacing,
          y: config.svgPaddingY + offsetY + n * nodeSpacing,
        });
      }
      positions.push(layerPositions);
    }
    return positions;
  }

  function activationToColor(a) {
    const r = Math.round(30 + a * 200); // colour transitions from rgb(30,100,200) to rgb(230,180,40) as activation goes from 0 to 1
    const g = Math.round(100 + a * 80);
    const b = Math.round(200 - a * 160);
    return `rgb(${r},${g},${b})`;
  }

  function weightToColor(w) {
    const alpha = 0.3 + Math.abs(w) * 0.7; // controls the minimum and maximum opacity where 0 is 0% opacity and 1 is 100% opacity
    if (w > 0) return `rgba(40,167,69,${alpha.toFixed(2)})`; // change the RGB values to adjust the colour of positive weights
    return `rgba(220,53,69,${alpha.toFixed(2)})`; // change the RGB values to adjust the colour of negative weights
  }

  function svgEl(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function buildInputSliders(count) {
    const container = document.getElementById("input-sliders");
    container.innerHTML = "";
    // Trim or extend inputs array to match count
    while (inputs.length < count)
      inputs.push(parseFloat(Math.random().toFixed(2)));
    inputs = inputs.slice(0, count);

    for (let i = 0; i < count; i++) {
      container.innerHTML += `
        <label class="form-label d-flex justify-content-between">
          Input ${i + 1} <code id="input-${i}-val">${inputs[i].toFixed(2)}</code>
        </label>
        <input type="range" class="form-range mb-2" id="input-${i}"
          min="0" max="1" step="0.01" value="${inputs[i]}" />
      `;
    }

    // Re-attach listeners for each input slider
    for (let i = 0; i < count; i++) {
      document
        .getElementById(`input-${i}`)
        .addEventListener("input", updateInputs);
    }
  }

  function clearFocus() {
    const svg = document.getElementById("nn-svg");
    svg.querySelectorAll("circle, line").forEach((el) => {
      el.setAttribute("opacity", "1");
    });
  }

  function focusNode(layer, node) {
    const svg = document.getElementById("nn-svg");
    // Dim everything
    svg.querySelectorAll("circle, line").forEach((el) => {
      el.setAttribute("opacity", "0.15");
    });
    // Highlight this node
    svg
      .querySelector(`circle[data-layer="${layer}"][data-node="${node}"]`)
      ?.setAttribute("opacity", "1");
    // Highlight connected edges and their neighbour nodes
    svg.querySelectorAll("line").forEach((line) => {
      const ll = parseInt(line.getAttribute("data-layer"));
      const lf = parseInt(line.getAttribute("data-from"));
      const lt = parseInt(line.getAttribute("data-to"));
      const isIncoming = ll === layer - 1 && lt === node;
      const isOutgoing = ll === layer && lf === node;
      if (isIncoming || isOutgoing) {
        line.setAttribute("opacity", "1");
        // Also highlight the neighbour node
        if (isIncoming) {
          svg
            .querySelector(`circle[data-layer="${ll}"][data-node="${lf}"]`)
            ?.setAttribute("opacity", "1");
        }
        if (isOutgoing) {
          svg
            .querySelector(`circle[data-layer="${ll + 1}"][data-node="${lt}"]`)
            ?.setAttribute("opacity", "1");
        }
      }
    });
  }

  function focusEdge(layer, to, from) {
    const svg = document.getElementById("nn-svg");
    // Dim everything
    svg.querySelectorAll("circle, line").forEach((el) => {
      el.setAttribute("opacity", "0.15");
    });
    // Highlight the two connected nodes and this edge
    svg
      .querySelector(`circle[data-layer="${layer}"][data-node="${from}"]`)
      ?.setAttribute("opacity", "1");
    svg
      .querySelector(`circle[data-layer="${layer + 1}"][data-node="${to}"]`)
      ?.setAttribute("opacity", "1");
    svg
      .querySelector(
        `line[data-layer="${layer}"][data-from="${from}"][data-to="${to}"]`,
      )
      ?.setAttribute("opacity", "1");
  }

  function render() {
    forwardPass();
    const positions = getNodePositions();

    const svg = document.getElementById("nn-svg");
    svg.setAttribute("viewBox", `0 0 ${config.svgWidth} ${config.svgHeight}`);
    svg.innerHTML = "";

    // Click on SVG background to clear focus
    const bg = svgEl("rect");
    bg.setAttribute("x", 0);
    bg.setAttribute("y", 0);
    bg.setAttribute("width", config.svgWidth);
    bg.setAttribute("height", config.svgHeight);
    bg.setAttribute("fill", "transparent");
    bg.addEventListener("click", () => {
      clearFocus();
      document.getElementById("nn-info-panel").innerHTML =
        '<span class="text-muted">Click a node or edge to inspect the maths.</span>';
    });
    svg.appendChild(bg);

    // Draw edges
    for (let l = 0; l < layers.length - 1; l++) {
      for (let i = 0; i < layers[l + 1]; i++) {
        for (let j = 0; j < layers[l]; j++) {
          const w = weights[l][i][j];

          // Visible line
          const line = svgEl("line");
          line.setAttribute("x1", positions[l][j].x);
          line.setAttribute("y1", positions[l][j].y);
          line.setAttribute("x2", positions[l + 1][i].x);
          line.setAttribute("y2", positions[l + 1][i].y);
          line.setAttribute("stroke", weightToColor(w));
          line.setAttribute("stroke-width", Math.max(1, Math.abs(w) * 3));
          line.setAttribute("pointer-events", "none");
          line.setAttribute("data-layer", l);
          line.setAttribute("data-from", j);
          line.setAttribute("data-to", i);

          const title = svgEl("title");
          title.textContent = `w = ${w.toFixed(4)}`;
          line.appendChild(title);
          svg.appendChild(line);

          // Invisible wide hit target on top
          const hitLine = svgEl("line");
          hitLine.setAttribute("x1", positions[l][j].x);
          hitLine.setAttribute("y1", positions[l][j].y);
          hitLine.setAttribute("x2", positions[l + 1][i].x);
          hitLine.setAttribute("y2", positions[l + 1][i].y);
          hitLine.setAttribute("stroke", "transparent");
          hitLine.setAttribute("stroke-width", "12");
          hitLine.setAttribute("cursor", "pointer");
          hitLine.addEventListener("click", (e) => {
            e.stopPropagation();
            focusEdge(l, i, j);
            showWeightInfo(l, i, j);
          });
          svg.appendChild(hitLine);
        }
      }
    }

    // Draw nodes
    const layerLabels = [
      "Input",
      ...Array(layers.length - 2)
        .fill(null)
        .map((_, i) => `Hidden ${i + 1}`),
      "Output",
    ];

    for (let l = 0; l < layers.length; l++) {
      // Layer label — pinned well above node area
      const label = svgEl("text");
      label.setAttribute("x", positions[l][0].x);
      label.setAttribute("y", "20");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "13");
      label.setAttribute("fill", "#adb5bd");
      label.textContent = layerLabels[l];
      svg.appendChild(label);

      for (let n = 0; n < layers[l]; n++) {
        const { x, y } = positions[l][n];
        const a = activations[l][n];

        const circle = svgEl("circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", config.nodeRadius);
        circle.setAttribute("fill", activationToColor(a));
        circle.setAttribute("stroke", "#ffffff");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("cursor", "pointer");
        // Data attributes for focus lookup
        circle.setAttribute("data-layer", l);
        circle.setAttribute("data-node", n);

        const title = svgEl("title");
        title.textContent = `a = ${a.toFixed(4)}`;
        circle.appendChild(title);
        circle.addEventListener("click", (e) => {
          e.stopPropagation();
          focusNode(l, n);
          showNodeInfo(l, n);
        });
        svg.appendChild(circle);

        const text = svgEl("text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "11");
        text.setAttribute("fill", "#ffffff");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("pointer-events", "none");
        text.textContent = a.toFixed(2);
        svg.appendChild(text);
      }
    }
  }

  function showNodeInfo(layer, node) {
    const a = activations[layer][node];
    const panel = document.getElementById("nn-info-panel");

    if (layer === 0) {
      panel.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="badge text-bg-primary">Input</span>
          <strong>Node ${node + 1}</strong>
        </div>
        <div class="p-2 rounded bg-body-secondary">
          <span class="text-muted small">Value</span><br>
          <code class="fs-5">${a.toFixed(4)}</code>
        </div>
        <p class="text-muted small mt-2 mb-0">Input nodes pass raw values directly to the next layer. No activation function is applied.</p>
      `;
      return;
    }

    const isOutput = layer === layers.length - 1;
    const badge = isOutput
      ? `<span class="badge text-bg-warning text-dark">Output</span>`
      : `<span class="badge text-bg-secondary">Hidden</span>`;

    let z = biases[layer - 1][node];
    const b = biases[layer - 1][node];
    let zStr = `<tr><td class="text-muted pe-3">bias</td><td><code>${b.toFixed(4)}</code></td></tr>`;

    for (let j = 0; j < layers[layer - 1]; j++) {
      const w = weights[layer - 1][node][j];
      const prevA = activations[layer - 1][j];
      z += w * prevA;
      zStr += `
        <tr>
          <td class="text-muted pe-3">w<sub>${j + 1}</sub> &times; a<sub>${j + 1}</sub></td>
          <td><code>${w.toFixed(3)} &times; ${prevA.toFixed(3)} = ${(w * prevA).toFixed(4)}</code></td>
        </tr>`;
    }

    panel.innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-3">
        ${badge}
        <strong>Layer ${layer}, Node ${node + 1}</strong>
      </div>
      <div class="row g-2">
        <div class="col-12 col-lg-7">
          <p class="text-muted small mb-1 fw-semibold">Step 1 &mdash; Weighted sum</p>
          <div class="p-2 rounded bg-body-secondary">
            <table class="table table-sm table-borderless mb-1" style="font-size:0.8rem">
              ${zStr}
            </table>
            <div class="border-top pt-1">
              <code>z = ${z.toFixed(4)}</code>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-5">
          <p class="text-muted small mb-1 fw-semibold">Step 2 &mdash; Activation &sigma;(z)</p>
          <div class="p-2 rounded bg-body-secondary h-100">
            <code class="d-block">&sigma;(${z.toFixed(4)})</code>
            <code class="d-block">= 1 / (1 + e<sup>${(-z).toFixed(4)}</sup>)</code>
            <code class="d-block fw-bold fs-5 mt-1">${a.toFixed(4)}</code>
          </div>
        </div>
      </div>
    `;
  }

  function showWeightInfo(layer, to, from) {
    const w = weights[layer][to][from];
    const fromA = activations[layer][from];
    const contribution = w * fromA;
    const panel = document.getElementById("nn-info-panel");
    const sign = w >= 0 ? "positive" : "negative";
    const badgeClass = w >= 0 ? "text-bg-success" : "text-bg-danger";

    panel.innerHTML = `
      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="badge ${badgeClass}">${sign}</span>
        <strong>Weight &mdash; Layer ${layer + 1} &rarr; Layer ${layer + 2}</strong>
      </div>
      <div class="row g-2">
        <div class="col-4">
          <div class="p-2 rounded bg-body-secondary text-center">
            <span class="text-muted small d-block">Weight</span>
            <code class="fs-5">${w.toFixed(4)}</code>
          </div>
        </div>
        <div class="col-4">
          <div class="p-2 rounded bg-body-secondary text-center">
            <span class="text-muted small d-block">Input activation</span>
            <code class="fs-5">${fromA.toFixed(4)}</code>
          </div>
        </div>
        <div class="col-4">
          <div class="p-2 rounded bg-body-secondary text-center">
            <span class="text-muted small d-block">Contribution</span>
            <code class="fs-5">${contribution.toFixed(4)}</code>
          </div>
        </div>
      </div>
      <p class="text-muted small mt-2 mb-0">
        This weight scales the activation from the previous node before it is summed with all other weighted inputs.
      </p>
    `;
  }

  function updateShape() {
    const numInputs = parseInt(document.getElementById("num-inputs").value);
    const hiddenLayers = parseInt(
      document.getElementById("hidden-layers").value,
    );
    const hiddenNodes = parseInt(document.getElementById("hidden-nodes").value);
    const numOutputs = parseInt(document.getElementById("num-outputs").value);
    document.getElementById("num-inputs-val").textContent = numInputs;
    document.getElementById("hidden-layers-val").textContent = hiddenLayers;
    document.getElementById("hidden-nodes-val").textContent = hiddenNodes;
    document.getElementById("num-outputs-val").textContent = numOutputs;

    layers = [numInputs, ...Array(hiddenLayers).fill(hiddenNodes), numOutputs];
    buildInputSliders(numInputs);
    initNetwork();
    render();
    document.getElementById("nn-info-panel").innerHTML =
      '<span class="text-muted">Click a node or edge to inspect the maths.</span>';
  }

  function updateInputs() {
    for (let i = 0; i < inputs.length; i++) {
      inputs[i] = parseFloat(document.getElementById(`input-${i}`).value);
      document.getElementById(`input-${i}-val`).textContent =
        inputs[i].toFixed(2);
    }
    render();
  }

  function init() {
    initNetwork();
    buildInputSliders(inputs.length);
    render();

    document
      .getElementById("num-inputs")
      .addEventListener("input", updateShape);
    document
      .getElementById("hidden-layers")
      .addEventListener("input", updateShape);
    document
      .getElementById("hidden-nodes")
      .addEventListener("input", updateShape);
    document
      .getElementById("num-outputs")
      .addEventListener("input", updateShape);

    document.getElementById("btn-randomise").addEventListener("click", () => {
      initNetwork();
      render();
      document.getElementById("nn-info-panel").innerHTML =
        '<span class="text-muted">Click a node or edge to inspect the maths.</span>';
    });

    document
      .getElementById("nnModal")
      .addEventListener("shown.bs.modal", () => render());
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => NNVisualiser.init());
