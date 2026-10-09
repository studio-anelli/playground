export const kineticPresets = [
  {
    "id": "echo",
    "name": "Echo",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 0.57,
            "amp": 0.59,
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
            "shape": "sine",
            "rate": 6,
            "amp": 0.71,
            "speed": 0.12,
            "direction": 0.46,
            "phase": 0.88
          }
        ],
        "values": {
          "step": 3.2,
          "jitter": 0,
          "positionX": 0,
          "positionY": 0,
          "repeatScale": 100,
          "repeatSpacingX": 25,
          "repeatSpacingY": 25,
          "repeatAngle": 0,
          "vertexSize": 0.64,
          "vertexMix": 1,
          "fontSize": 25,
          "weight": 900,
          "feedbackAmount": 0.98,
          "feedbackRefresh": 422
        },
        "manual": {
          "threshold": 0.42,
          "opacity": 1,
          "repeatCount": 5,
          "repeatColumns": 3,
          "repeatRows": 3,
          "lineLength": 6,
          "tracking": -6.5
        },
        "modes": {
          "sampling": false,
          "grid": false,
          "vertex": true,
          "feedback": false
        },
        "patches": [
          {
            "id": "2-fontSize",
            "wave": 2,
            "target": "fontSize",
            "amount": 56
          },
          {
            "id": "2-vertexSize",
            "wave": 2,
            "target": "vertexSize",
            "amount": 50
          }
        ],
        "text": "echo",
        "font": "ui-monospace, monospace",
        "vertex": "glyph",
        "repeatMode": "single",
        "samplingMode": "xy",
        "glyphPattern": "ECHO",
        "paused": false,
        "bg": "#000000",
        "ink": "#ffffff",
        "bicolour": false,
        "ink2": "#ffffff",
        "feedbackBlend": "difference",
        "videoPatches": [
          {
            "source": "typography",
            "target": "feedback"
          },
          {
            "source": "feedback",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "canvas"
          }
        ]
      }
    }
  },
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
    "id": "echo-stain",
    "name": "Echo Stain",
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
          "vertexSize": 1.4,
          "vertexMix": 1,
          "fontSize": 34,
          "weight": 800,
          "feedbackAmount": 0.98,
          "feedbackRefresh": 16
        },
        "manual": {
          "threshold": 0.42,
          "opacity": 0.51,
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
            "id": "0-jitter",
            "wave": 0,
            "target": "jitter",
            "amount": 50
          }
        ],
        "text": "echo",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "line",
        "samplingMode": "y",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#000000",
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
  }
];
