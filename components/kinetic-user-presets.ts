// User-supplied REC-10 presets. Imported variable font binaries are deliberately not published.
// They use system sans instead, so letter shapes can differ from the original JSON files.
export const userKineticPresets = [
  {
    "id": "elektro",
    "name": "Elektro",
    "preset": {
      "format": "k-tic-synth",
      "version": 2,
      "state": {
        "vertexSVG": {
          "name": "smile.svg",
          "svg": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" viewBox=\"0 0 80 80\">\n  <!-- Generator: Adobe Illustrator 30.8.2, SVG Export Plug-In . SVG Version: 2.1.4 Build 7)  -->\n  <defs><style>.st0 { fill: #231f20; }</style></defs>\n  <path class=\"st0\" d=\"M40,0C17.91,0,0,17.91,0,40s17.91,40,40,40,40-17.91,40-40S62.09,0,40,0ZM52.92,18.23c4,0,7.24,5.14,7.24,11.47s-3.24,11.47-7.24,11.47-7.24-5.14-7.24-11.47,3.24-11.47,7.24-11.47ZM27.01,18.23c4,0,7.24,5.14,7.24,11.47s-3.24,11.47-7.24,11.47-7.24-5.14-7.24-11.47,3.24-11.47,7.24-11.47ZM39.45,70.13c-16.7,0-30.28-13.58-30.28-30.28h3c0,15.04,12.24,27.28,27.28,27.28s27.28-12.24,27.28-27.28h3c0,16.7-13.58,30.28-30.28,30.28Z\"/>\n</svg>"
        },
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
        "stripSpacing": 0,
        "vertexSpacing": 0,
        "vertexScatter": 0,
        "glyphOrigins": {},
        "samplingThicknessLinked": true,
        "samplingThicknessUnit": "em",
        "vertexSizeUnit": "em",
        "samplingThicknessX": 6,
        "samplingThicknessY": 1.5,
        "textAlign": "center",
        "lineHeight": 0.95,
        "kerning": "optical",
        "bpm": 120,
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
            "shape": "triangle",
            "rate": 0.35,
            "amp": 1,
            "speed": 0.65,
            "direction": 1,
            "phase": 0
          }
        ],
        "values": {
          "step": 8.58,
          "jitter": 17.7,
          "positionX": 0,
          "positionY": 0,
          "repeatScale": 100,
          "repeatSpacingX": 25,
          "repeatSpacingY": 25,
          "repeatAngle": 0,
          "vertexSize": 10,
          "vertexMix": 1,
          "fontSize": 30,
          "weight": 580,
          "feedbackAmount": 0.65,
          "feedbackRefresh": 120
        },
        "manual": {
          "threshold": 0.17,
          "opacity": 1,
          "repeatCount": 5,
          "repeatColumns": 3,
          "repeatRows": 3,
          "lineLength": 6,
          "tracking": 19.7
        },
        "modes": {
          "sampling": false,
          "grid": false,
          "vertex": true,
          "feedback": false
        },
        "patches": [],
        "text": "ELE\nKTRO",
        "font": "system-ui, sans-serif",
        "vertex": "custom",
        "repeatMode": "single",
        "samplingMode": "xy",
        "glyphPattern": "*+o",
        "paused": false,
        "bg": "#0433ff",
        "ink": "#000000",
        "bicolour": false,
        "ink2": "#ffffff",
        "feedbackBlend": "source-over",
        "repeatBlend": "source-over",
        "feedbackTiming": "free",
        "feedbackDivision": "1/4",
        "videoPatches": [
          {
            "source": "typography",
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
  },
  {
    "id": "playground-default",
    "name": "Playground Default",
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
