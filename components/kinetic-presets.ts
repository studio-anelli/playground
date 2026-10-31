export const kineticPresets = [
  {
    "id": "acid",
    "name": "Acid",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 0.57,
            "amp": 0.46,
            "speed": 0.07,
            "direction": 0,
            "phase": 0.49
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 2.79,
            "amp": 0.5,
            "speed": 0.12,
            "direction": 0.5,
            "phase": 0.25
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 0.35,
            "amp": 0.94,
            "speed": 0.39,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 3,
          "jitter": 0,
          "positionX": 0,
          "positionY": 0,
          "repeatScale": 200,
          "repeatSpacingX": 25,
          "repeatSpacingY": 25,
          "repeatAngle": 0,
          "vertexSize": 1.4,
          "vertexMix": 1,
          "fontSize": 34,
          "weight": 800,
          "feedbackAmount": 0.98,
          "feedbackRefresh": 16
        },
        "manual": {
          "threshold": 0.42,
          "opacity": 1,
          "repeatCount": 5,
          "repeatColumns": 3,
          "repeatRows": 3,
          "lineLength": 6,
          "tracking": -2.2
        },
        "modes": {
          "sampling": true,
          "grid": true,
          "vertex": true,
          "feedback": true
        },
        "patches": [
          {
            "id": "dream-vertex",
            "wave": 2,
            "target": "vertexSize",
            "amount": 100
          },
          {
            "id": "dream-type",
            "wave": 1,
            "target": "fontSize",
            "amount": 50
          },
          {
            "id": "0-jitter",
            "wave": 0,
            "target": "jitter",
            "amount": 50
          }
        ],
        "text": "echo",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "single",
        "samplingMode": "xy",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#000000",
        "ink": "#00f900",
        "bicolour": true,
        "ink2": "#ffffff",
        "feedbackBlend": "overlay",
        "videoPatches": [
          {
            "source": "typography",
            "target": "sampling"
          },
          {
            "source": "sampling",
            "target": "grid"
          },
          {
            "source": "grid",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "feedback"
          },
          {
            "source": "feedback",
            "target": "canvas"
          }
        ]
      }
    }
  },
  {
    "id": "echo-super",
    "name": "Echo Super",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 0.57,
            "amp": 0.46,
            "speed": 0.07,
            "direction": 0,
            "phase": 0.49
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 2.79,
            "amp": 0.5,
            "speed": 0.12,
            "direction": 0.5,
            "phase": 0.25
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 0.35,
            "amp": 0.94,
            "speed": 0.39,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 1.6,
          "jitter": 0,
          "positionX": 0,
          "positionY": 0,
          "repeatScale": 168,
          "repeatSpacingX": 39.3,
          "repeatSpacingY": 25,
          "repeatAngle": 39,
          "vertexSize": 0.82,
          "vertexMix": 1,
          "fontSize": 34,
          "weight": 800,
          "feedbackAmount": 0.98,
          "feedbackRefresh": 16
        },
        "manual": {
          "threshold": 0.42,
          "opacity": 1,
          "repeatCount": 4,
          "repeatColumns": 3,
          "repeatRows": 3,
          "lineLength": 6,
          "tracking": -2.2
        },
        "modes": {
          "sampling": true,
          "grid": true,
          "vertex": true,
          "feedback": true
        },
        "patches": [
          {
            "id": "dream-vertex",
            "wave": 2,
            "target": "vertexSize",
            "amount": 100
          },
          {
            "id": "dream-type",
            "wave": 1,
            "target": "fontSize",
            "amount": 50
          },
          {
            "id": "0-step",
            "wave": 0,
            "target": "step",
            "amount": 50
          }
        ],
        "text": "echo",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "line",
        "samplingMode": "x",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#ff2600",
        "ink": "#00f900",
        "bicolour": true,
        "ink2": "#0433ff",
        "feedbackBlend": "lighter",
        "videoPatches": [
          {
            "source": "typography",
            "target": "sampling"
          },
          {
            "source": "sampling",
            "target": "grid"
          },
          {
            "source": "grid",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "feedback"
          },
          {
            "source": "feedback",
            "target": "canvas"
          }
        ]
      }
    }
  },
  {
    "id": "grow",
    "name": "Grow",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 0.57,
            "amp": 0.46,
            "speed": 0.07,
            "direction": 0,
            "phase": 0.49
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 2.79,
            "amp": 0.03,
            "speed": 0.12,
            "direction": 0.5,
            "phase": 0.25
          },
          {
            "on": true,
            "shape": "triangle",
            "rate": 0.35,
            "amp": 0.94,
            "speed": 0.39,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 1,
          "jitter": 0,
          "positionX": 0,
          "positionY": 0,
          "repeatScale": 95,
          "repeatSpacingX": 25,
          "repeatSpacingY": 25,
          "repeatAngle": 0,
          "vertexSize": 1.4,
          "vertexMix": 1,
          "fontSize": 34,
          "weight": 230,
          "feedbackAmount": 0.81,
          "feedbackRefresh": 1827
        },
        "manual": {
          "threshold": 0.42,
          "opacity": 0.88,
          "repeatCount": 5,
          "repeatColumns": 3,
          "repeatRows": 3,
          "lineLength": 6,
          "tracking": 3.7
        },
        "modes": {
          "sampling": true,
          "grid": true,
          "vertex": true,
          "feedback": true
        },
        "patches": [
          {
            "id": "import-0",
            "wave": 2,
            "target": "vertexSize",
            "amount": 100
          },
          {
            "id": "import-2",
            "wave": 0,
            "target": "jitter",
            "amount": 50
          },
          {
            "id": "1-positionX",
            "wave": 1,
            "target": "positionX",
            "amount": 50
          }
        ],
        "text": "grow",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "single",
        "samplingMode": "xy",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#2c1376",
        "ink": "#0433ff",
        "bicolour": true,
        "ink2": "#ffffff",
        "feedbackBlend": "difference",
        "videoPatches": [
          {
            "source": "typography",
            "target": "sampling"
          },
          {
            "source": "sampling",
            "target": "grid"
          },
          {
            "source": "grid",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "feedback"
          },
          {
            "source": "feedback",
            "target": "canvas"
          }
        ]
      }
    }
  }
];
