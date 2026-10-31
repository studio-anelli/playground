// User-supplied REC-10 presets. Imported variable font binaries are deliberately not published.
// They use system sans instead, so letter shapes can differ from the original JSON files.
export const userKineticPresets = [
  {
    "id": "iykyk",
    "name": "IYKYK",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "vertexSVG": null,
        "imageLayers": [],
        "type1On": true,
        "secondType": {
          "on": false,
          "text": "TYPE 2",
          "font": "system-ui, sans-serif",
          "size": 12,
          "weight": 800,
          "x": 0,
          "y": 25,
          "tracking": 0,
          "lineHeight": 1.1,
          "align": "center",
          "kerning": "normal",
          "ink": "#ffffff"
        },
        "stripSpacing": 1.38,
        "vertexSpacing": 5.9,
        "vertexScatter": 0,
        "glyphOrigins": {},
        "samplingThicknessLinked": true,
        "samplingThicknessUnit": "em",
        "vertexSizeUnit": "em",
        "samplingThicknessX": 1.75,
        "samplingThicknessY": 4.53,
        "textAlign": "center",
        "lineHeight": 0.85,
        "kerning": "none",
        "bpm": 120,
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 1.26,
            "amp": 1,
            "speed": 0.15,
            "direction": 0.73,
            "phase": 0.49,
            "timing": "sync",
            "division": "1"
          },
          {
            "on": true,
            "shape": "noise",
            "rate": 2.79,
            "amp": 0.13,
            "speed": 0.12,
            "direction": 0.7,
            "phase": 0.25,
            "timing": "sync",
            "division": "2"
          },
          {
            "on": true,
            "shape": "sine",
            "rate": 6,
            "amp": 0.27,
            "speed": 0.34,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 4.15,
          "jitter": 0,
          "positionX": -0.1,
          "positionY": -0.8,
          "repeatScale": 56,
          "repeatSpacingX": 43.2,
          "repeatSpacingY": 2.1,
          "repeatAngle": 44,
          "vertexSize": 3.27,
          "vertexMix": 1,
          "fontSize": 75,
          "weight": 900,
          "feedbackAmount": 0.65,
          "feedbackRefresh": 120
        },
        "manual": {
          "threshold": 0.71,
          "opacity": 1,
          "repeatCount": 5,
          "repeatColumns": 1,
          "repeatRows": 8,
          "lineLength": 21,
          "tracking": -10
        },
        "modes": {
          "sampling": true,
          "grid": true,
          "vertex": true,
          "feedback": false
        },
        "patches": [
          {
            "id": "0-vertexSize",
            "wave": 0,
            "target": "vertexSize",
            "amount": 50
          },
          {
            "id": "2-repeatAngle",
            "wave": 2,
            "target": "repeatAngle",
            "amount": 50
          },
          {
            "id": "1-repeatSpacingY",
            "wave": 1,
            "target": "repeatSpacingY",
            "amount": 50
          }
        ],
        "text": "IYKYK",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "grid",
        "samplingMode": "y",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#000000",
        "ink": "#ff2600",
        "bicolour": false,
        "ink2": "#ffffff",
        "feedbackBlend": "source-over",
        "repeatBlend": "exclusion",
        "feedbackTiming": "free",
        "feedbackDivision": "1/4",
        "videoPatches": [
          {
            "source": "typography",
            "target": "sampling"
          },
          {
            "source": "sampling",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "grid"
          },
          {
            "source": "grid",
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
    "id": "play-ground",
    "name": "Play Ground",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "vertexSVG": null,
        "imageLayers": [],
        "type1On": true,
        "secondType": {
          "on": false,
          "text": "TYPE 2",
          "font": "system-ui, sans-serif",
          "size": 12,
          "weight": 800,
          "x": 0,
          "y": 25,
          "tracking": 0,
          "lineHeight": 1.1,
          "align": "center",
          "kerning": "normal",
          "ink": "#ffffff"
        },
        "stripSpacing": 1.38,
        "vertexSpacing": 5.9,
        "vertexScatter": 0,
        "glyphOrigins": {},
        "samplingThicknessLinked": true,
        "samplingThicknessUnit": "em",
        "vertexSizeUnit": "em",
        "samplingThicknessX": 1.75,
        "samplingThicknessY": 4.53,
        "textAlign": "center",
        "lineHeight": 0.8,
        "kerning": "none",
        "bpm": 120,
        "waves": [
          {
            "on": true,
            "shape": "sine",
            "rate": 1.48,
            "amp": 1,
            "speed": 0.15,
            "direction": 0,
            "phase": 0.49,
            "timing": "sync",
            "division": "1/2"
          },
          {
            "on": true,
            "shape": "sine",
            "rate": 2.79,
            "amp": 1,
            "speed": 0.12,
            "direction": 0.7,
            "phase": 0.25,
            "timing": "sync",
            "division": "2"
          },
          {
            "on": true,
            "shape": "sine",
            "rate": 6,
            "amp": 0.27,
            "speed": 0.34,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 4.15,
          "jitter": 0,
          "positionX": -0.1,
          "positionY": -0.8,
          "repeatScale": 85,
          "repeatSpacingX": 43.2,
          "repeatSpacingY": 0.4,
          "repeatAngle": 44,
          "vertexSize": 3.27,
          "vertexMix": 1,
          "fontSize": 75,
          "weight": 900,
          "feedbackAmount": 0.65,
          "feedbackRefresh": 120
        },
        "manual": {
          "threshold": 0.71,
          "opacity": 1,
          "repeatCount": 5,
          "repeatColumns": 1,
          "repeatRows": 8,
          "lineLength": 21,
          "tracking": 6.3
        },
        "modes": {
          "sampling": true,
          "grid": true,
          "vertex": true,
          "feedback": false
        },
        "patches": [
          {
            "id": "0-vertexSize",
            "wave": 0,
            "target": "vertexSize",
            "amount": 50
          },
          {
            "id": "2-repeatAngle",
            "wave": 2,
            "target": "repeatAngle",
            "amount": 50
          }
        ],
        "text": "Play\nground",
        "font": "system-ui, sans-serif",
        "vertex": "dot",
        "repeatMode": "grid",
        "samplingMode": "y",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#000000",
        "ink": "#ff2600",
        "bicolour": false,
        "ink2": "#ffffff",
        "feedbackBlend": "source-over",
        "repeatBlend": "exclusion",
        "feedbackTiming": "free",
        "feedbackDivision": "1/4",
        "videoPatches": [
          {
            "source": "typography",
            "target": "sampling"
          },
          {
            "source": "sampling",
            "target": "vertex"
          },
          {
            "source": "vertex",
            "target": "grid"
          },
          {
            "source": "grid",
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
