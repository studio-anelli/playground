import React, { useEffect, useMemo, useRef, useState } from 'react';

const GRID = 24;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const STORAGE_KEY = 'variable-font-block-editor-v1';
const BACKUP_KEY = 'variable-font-block-editor-backup-v1';

const makeFullBlock = () =>
  Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => 'letter'));

const cloneGrid = (grid) => grid.map((row) => [...row]);
const makeGridSizes = () => Array.from({ length: GRID }, () => 1);
const sumGridSizes = (sizes) => sizes.reduce((total, size) => total + size, 0);

const makeGridOffsets = (sizes) => {
  const offsets = [0];
  sizes.forEach((size) => offsets.push(offsets[offsets.length - 1] + size));
  return offsets;
};

const getTrackIndexAtPosition = (position, sizes) => {
  const total = sumGridSizes(sizes);
  const target = Math.max(0, Math.min(total - Number.EPSILON, position * total));
  let offset = 0;

  for (let index = 0; index < sizes.length; index += 1) {
    offset += sizes[index];
    if (target < offset) return index;
  }

  return sizes.length - 1;
};

const getCellsBetween = (start, end) => {
  const cells = [];
  let x = start.x;
  let y = start.y;
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    cells.push({ x, y });
    if (x === end.x && y === end.y) break;

    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }

  return cells;
};

const pointKey = (point) => `${point.x},${point.y}`;
const edgeKey = (start, end) => `${pointKey(start)}>${pointKey(end)}`;

const getDirection = (start, end) => {
  if (end.x > start.x) return 0;
  if (end.y > start.y) return 1;
  if (end.x < start.x) return 2;
  return 3;
};

const getRoundedCellPath = (grid, includedCells, columnWidths, rowHeights) => {
  const edges = new Map();
  const xOffsets = makeGridOffsets(columnWidths);
  const yOffsets = makeGridOffsets(rowHeights);

  const addEdge = (start, end) => {
    const reverseKey = edgeKey(end, start);
    if (edges.has(reverseKey)) {
      edges.delete(reverseKey);
      return;
    }
    edges.set(edgeKey(start, end), { start, end });
  };

  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!includedCells.has(cell)) return;

      const left = xOffsets[x];
      const right = xOffsets[x + 1];
      const top = yOffsets[y];
      const bottom = yOffsets[y + 1];

      addEdge({ x: left, y: top }, { x: right, y: top });
      addEdge({ x: right, y: top }, { x: right, y: bottom });
      addEdge({ x: right, y: bottom }, { x: left, y: bottom });
      addEdge({ x: left, y: bottom }, { x: left, y: top });
    });
  });

  const remaining = new Map(edges);
  const loops = [];

  while (remaining.size > 0) {
    const [firstKey, firstEdge] = remaining.entries().next().value;
    remaining.delete(firstKey);

    const loop = [firstEdge.start];
    let previous = firstEdge.start;
    let current = firstEdge.end;
    let guard = edges.size + 1;

    while (pointKey(current) !== pointKey(loop[0]) && guard > 0) {
      loop.push(current);
      const candidates = [...remaining.entries()].filter(
        ([, edge]) => pointKey(edge.start) === pointKey(current)
      );
      if (candidates.length === 0) break;

      const previousDirection = getDirection(previous, current);
      candidates.sort(([, edgeA], [, edgeB]) => {
        const turnA = (getDirection(edgeA.start, edgeA.end) - previousDirection + 4) % 4;
        const turnB = (getDirection(edgeB.start, edgeB.end) - previousDirection + 4) % 4;
        const priority = [1, 0, 3, 2];
        return priority.indexOf(turnA) - priority.indexOf(turnB);
      });

      const [nextKey, nextEdge] = candidates[0];
      remaining.delete(nextKey);
      previous = current;
      current = nextEdge.end;
      guard -= 1;
    }

    if (pointKey(current) === pointKey(loop[0]) && loop.length >= 3) loops.push(loop);
  }

  return loops
    .map((loop) =>
      loop.filter((point, index) => {
        const previous = loop[(index - 1 + loop.length) % loop.length];
        const next = loop[(index + 1) % loop.length];
        return (
          (point.x - previous.x) * (next.y - point.y) !==
          (point.y - previous.y) * (next.x - point.x)
        );
      })
    )
    .filter((loop) => loop.length >= 3)
    .map((loop) => {
      const corners = loop.map((point, index) => {
        const previous = loop[(index - 1 + loop.length) % loop.length];
        const next = loop[(index + 1) % loop.length];
        const previousLength = Math.hypot(point.x - previous.x, point.y - previous.y);
        const nextLength = Math.hypot(next.x - point.x, next.y - point.y);
        const radius = Math.min(0.34, previousLength / 2, nextLength / 2);

        return {
          point,
          entry: {
            x: point.x + ((previous.x - point.x) / previousLength) * radius,
            y: point.y + ((previous.y - point.y) / previousLength) * radius,
          },
          exit: {
            x: point.x + ((next.x - point.x) / nextLength) * radius,
            y: point.y + ((next.y - point.y) / nextLength) * radius,
          },
        };
      });

      return corners.reduce(
        (path, corner, index) =>
          `${path}${index === 0 ? `M ${corner.entry.x} ${corner.entry.y}` : ` L ${corner.entry.x} ${corner.entry.y}`} Q ${corner.point.x} ${corner.point.y} ${corner.exit.x} ${corner.exit.y}`,
        ''
      ) + ' Z';
    })
    .join(' ');
};

function SmoothGridPreview({
  grid,
  viewMode,
  visibility,
  columnWidths,
  rowHeights,
  className = '',
  style,
}) {
  const openingPath = useMemo(
    () => getRoundedCellPath(grid, new Set(['carving', 'portal']), columnWidths, rowHeights),
    [columnWidths, grid, rowHeights]
  );
  const background = viewMode === 'bw' ? '#ffffff' : '#f3f4f6';
  const baseFill = visibility.letter ? cellStyleMap[viewMode].letter : background;
  const width = sumGridSizes(columnWidths);
  const height = sumGridSizes(rowHeights);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={style}
      shapeRendering="geometricPrecision"
      aria-label="Smoothed grid preview"
      role="img"
    >
      <rect width={width} height={height} fill={baseFill} />
      <path
        d={openingPath}
        fill={visibility.carving ? cellStyleMap[viewMode].carving : background}
        fillRule="evenodd"
      />
    </svg>
  );
}

const makeAlphabet = () => Object.fromEntries(LETTERS.map((letter) => [letter, makeFullBlock()]));

const isValidCell = (cell) => ['letter', 'carving', 'portal'].includes(cell);
const isCarvingCell = (cell) => cell === 'carving' || cell === 'portal';

const getDisplayGrid = (grid, gridSize) => {
  const scale = GRID / gridSize;
  return Array.from({ length: gridSize }, (_, displayY) =>
    Array.from({ length: gridSize }, (_, displayX) => {
      for (let y = displayY * scale; y < (displayY + 1) * scale; y += 1) {
        for (let x = displayX * scale; x < (displayX + 1) * scale; x += 1) {
          if (isCarvingCell(grid[y][x])) return 'carving';
        }
      }
      return 'letter';
    })
  );
};

const getGroupedSizes = (sizes, gridSize) => {
  const scale = GRID / gridSize;
  return Array.from({ length: gridSize }, (_, index) =>
    sizes.slice(index * scale, (index + 1) * scale).reduce((total, size) => total + size, 0)
  );
};

const isValidGrid = (grid) =>
  Array.isArray(grid) &&
  grid.length === GRID &&
  grid.every(
    (row) => Array.isArray(row) && row.length === GRID && row.every((cell) => isValidCell(cell))
  );

const sanitizeLettersData = (raw) => {
  const fallback = makeAlphabet();
  if (!raw || typeof raw !== 'object') return fallback;

  return Object.fromEntries(
    LETTERS.map((letter) => {
      const candidate = raw[letter];
      return [letter, isValidGrid(candidate) ? candidate : fallback[letter]];
    })
  );
};

const loadSavedAlphabet = () => {
  if (typeof window === 'undefined') return makeAlphabet();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return sanitizeLettersData(JSON.parse(raw));
    }

    const backupRaw = window.localStorage.getItem(BACKUP_KEY);
    if (backupRaw) {
      const parsedBackup = JSON.parse(backupRaw);
      return sanitizeLettersData(parsedBackup?.letters ?? parsedBackup);
    }

    return makeAlphabet();
  } catch {
    return makeAlphabet();
  }
};

const makeBackupSnapshot = (letters) => ({
  savedAt: new Date().toISOString(),
  letters,
});

const cellStyleMap = {
  bw: {
    letter: '#000000',
    carving: '#ffffff',
  },
  color: {
    letter: '#9ca3af',
    carving: '#ef4444',
  },
};

function getVisibleColor(cell, viewMode, visibility) {
  if (cell === 'letter' && visibility.letter) return cellStyleMap[viewMode].letter;
  if (isCarvingCell(cell) && visibility.carving) return cellStyleMap[viewMode].carving;

  if (viewMode === 'bw') {
    return '#ffffff';
  }
  return '#f3f4f6';
}

export default function VariableFontBlockEditor() {
  const fileInputRef = useRef(null);
  const drawingGridRef = useRef(null);
  const strokeRef = useRef(null);
  const resizeRef = useRef(null);
  const [currentLetter, setCurrentLetter] = useState('A');
  const [tool, setTool] = useState('carving');
  const [viewMode, setViewMode] = useState('color');
  const [lettersData, setLettersData] = useState(loadSavedAlphabet);
  const [visibility, setVisibility] = useState({
    letter: true,
    carving: true,
  });
  const [saveMessage, setSaveMessage] = useState('Autosave active');
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(GRID);
  const [columnWidths, setColumnWidths] = useState(makeGridSizes);
  const [rowHeights, setRowHeights] = useState(makeGridSizes);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const previousRaw = window.localStorage.getItem(STORAGE_KEY);
      if (previousRaw) {
        const previousParsed = JSON.parse(previousRaw);
        window.localStorage.setItem(BACKUP_KEY, JSON.stringify(makeBackupSnapshot(previousParsed)));
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lettersData));
      setSaveMessage('Saved locally');
    } catch {
      setSaveMessage('Local save unavailable');
    }
  }, [lettersData]);

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timeout = window.setTimeout(() => {
      setSaveMessage('Autosave active');
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const grid = useMemo(() => lettersData[currentLetter], [lettersData, currentLetter]);
  const displayGrid = useMemo(() => getDisplayGrid(grid, gridSize), [grid, gridSize]);
  const displayColumnWidths = useMemo(
    () => getGroupedSizes(columnWidths, gridSize),
    [columnWidths, gridSize]
  );
  const displayRowHeights = useMemo(
    () => getGroupedSizes(rowHeights, gridSize),
    [gridSize, rowHeights]
  );
  const columnTemplate = useMemo(
    () => displayColumnWidths.map((width) => `minmax(0, ${width}fr)`).join(' '),
    [displayColumnWidths]
  );
  const rowTemplate = useMemo(
    () => displayRowHeights.map((height) => `minmax(0, ${height}fr)`).join(' '),
    [displayRowHeights]
  );

  const paintCells = (cells, mode) => {
    setLettersData((prev) => {
      const nextGrid = cloneGrid(prev[currentLetter]);
      let changed = false;

      const scale = GRID / gridSize;

      cells.forEach(({ x: displayX, y: displayY }) => {
        for (let y = displayY * scale; y < (displayY + 1) * scale; y += 1) {
          for (let x = displayX * scale; x < (displayX + 1) * scale; x += 1) {
            const current = nextGrid[y][x];
            const nextCell = mode === 'erase' ? (isCarvingCell(current) ? 'letter' : current) : tool;

            if (nextCell !== current) {
              nextGrid[y][x] = nextCell;
              changed = true;
            }
          }
        }
      });

      if (!changed) return prev;
      return { ...prev, [currentLetter]: nextGrid };
    });
  };

  const getPointerCell = (event) => {
    const drawingGrid = drawingGridRef.current;
    if (!drawingGrid) return null;

    const bounds = drawingGrid.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX >= bounds.right ||
      event.clientY < bounds.top ||
      event.clientY >= bounds.bottom
    ) {
      return null;
    }

    return {
      x: getTrackIndexAtPosition(
        (event.clientX - bounds.left) / bounds.width,
        displayColumnWidths
      ),
      y: getTrackIndexAtPosition(
        (event.clientY - bounds.top) / bounds.height,
        displayRowHeights
      ),
    };
  };

  const startStroke = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const cell = getPointerCell(event);
    if (!cell) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const mode = isCarvingCell(displayGrid[cell.y][cell.x]) ? 'erase' : 'paint';
    strokeRef.current = { pointerId: event.pointerId, lastCell: cell, mode };
    paintCells([cell], mode);
  };

  const continueStroke = (event) => {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointerId !== event.pointerId) return;

    const cell = getPointerCell(event);
    if (!cell || (cell.x === stroke.lastCell.x && cell.y === stroke.lastCell.y)) return;

    event.preventDefault();
    paintCells(getCellsBetween(stroke.lastCell, cell), stroke.mode);
    stroke.lastCell = cell;
  };

  const endStroke = (event) => {
    if (strokeRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    strokeRef.current = null;
  };

  const resetCurrentLetter = () => {
    setLettersData((prev) => ({
      ...prev,
      [currentLetter]: makeFullBlock(),
    }));
  };

  const resetAllLetters = () => {
    setLettersData(makeAlphabet());
    setSaveMessage('All letters reset');
  };

  const exportAlphabet = () => {
    const payload = {
      version: 1,
      grid: GRID,
      letters: lettersData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variable-font-alphabet.json';
    a.click();
    window.URL.revokeObjectURL(url);
    setSaveMessage('JSON exported');
  };

  const importAlphabet = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedLetters = sanitizeLettersData(parsed?.letters ?? parsed);
      setLettersData(importedLetters);
      setSaveMessage('JSON imported');
    } catch {
      setSaveMessage('Import failed');
    }

    event.target.value = '';
  };

  const clearLocalSave = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(BACKUP_KEY);
    }
    setLettersData(makeAlphabet());
    setSaveMessage('Local save cleared');
  };

  const restoreBackup = () => {
    if (typeof window === 'undefined') return;

    try {
      const backupRaw = window.localStorage.getItem(BACKUP_KEY);
      if (!backupRaw) {
        setSaveMessage('No backup found');
        return;
      }

      const parsedBackup = JSON.parse(backupRaw);
      const restoredLetters = sanitizeLettersData(parsedBackup?.letters ?? parsedBackup);
      setLettersData(restoredLetters);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredLetters));
      setSaveMessage('Backup restored');
    } catch {
      setSaveMessage('Backup restore failed');
    }
  };

  const updateGridSize = (axis, index, nextSize) => {
    const setSizes = axis === 'column' ? setColumnWidths : setRowHeights;
    const scale = GRID / gridSize;
    const startIndex = index * scale;
    const sizePerCell = Math.max(0.2, Math.min(4, nextSize / scale));
    setSizes((previous) =>
      previous.map((size, sizeIndex) =>
        sizeIndex >= startIndex && sizeIndex < startIndex + scale ? sizePerCell : size
      )
    );
  };

  const startGridResize = (event, axis, index) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const sizes = axis === 'column' ? displayColumnWidths : displayRowHeights;
    resizeRef.current = {
      axis,
      index,
      pointerId: event.pointerId,
      startPosition: axis === 'column' ? event.clientX : event.clientY,
      startSize: sizes[index],
      totalSize: sumGridSizes(sizes),
    };
  };

  const continueGridResize = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;

    const bounds = drawingGridRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    const currentPosition = resize.axis === 'column' ? event.clientX : event.clientY;
    const dimension = resize.axis === 'column' ? bounds.width : bounds.height;
    const delta = ((currentPosition - resize.startPosition) / dimension) * resize.totalSize;
    updateGridSize(resize.axis, resize.index, resize.startSize + delta);
  };

  const endGridResize = (event) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeRef.current = null;
  };

  const handleGridSizeKey = (event, axis, index) => {
    const negativeKey = axis === 'column' ? 'ArrowLeft' : 'ArrowUp';
    const positiveKey = axis === 'column' ? 'ArrowRight' : 'ArrowDown';
    if (event.key !== negativeKey && event.key !== positiveKey) return;

    event.preventDefault();
    const sizes = axis === 'column' ? displayColumnWidths : displayRowHeights;
    const step = 0.1 * (GRID / gridSize);
    updateGridSize(axis, index, sizes[index] + (event.key === positiveKey ? step : -step));
  };

  const resetGridSizes = () => {
    setColumnWidths(makeGridSizes());
    setRowHeights(makeGridSizes());
  };

  const goToLetter = (direction) => {
    const index = LETTERS.indexOf(currentLetter);
    const nextIndex = (index + direction + LETTERS.length) % LETTERS.length;
    setCurrentLetter(LETTERS[nextIndex]);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-5 space-y-5 h-fit">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Variable font block editor</div>
            <h1 className="text-2xl font-semibold leading-tight">Grid letter drawing tool</h1>
            <p className="text-sm text-neutral-600 mt-2">
              Each letter starts as a full block. Draw continuous carving strokes to shape it.
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
              {saveMessage}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Current letter</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToLetter(-1)}
                className="px-3 py-2 rounded-2xl border border-neutral-300 hover:bg-neutral-50"
              >
                ←
              </button>
              <div className="flex-1 rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-center text-3xl font-semibold">
                {currentLetter}
              </div>
              <button
                onClick={() => goToLetter(1)}
                className="px-3 py-2 rounded-2xl border border-neutral-300 hover:bg-neutral-50"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 pt-1">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setCurrentLetter(letter)}
                  className={`rounded-xl px-2 py-2 text-sm border transition ${
                    currentLetter === letter
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Tools</div>
            <button
              type="button"
              onClick={() => setTool('carving')}
              aria-pressed={tool === 'carving'}
              className="w-full rounded-2xl border border-black bg-black px-4 py-3 text-sm font-medium text-white"
            >
              Carving
            </button>
            <p className="text-xs text-neutral-500">
              Press and drag to carve. Start on a carved cell to restore the letter.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">View switcher</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'bw', label: 'Black / White' },
                { id: 'color', label: 'Color' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id)}
                  className={`rounded-2xl px-4 py-3 border text-sm font-medium transition ${
                    viewMode === item.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Visibility</div>
            <div className="space-y-2">
              {[
                ['letter', 'Letter / grey'],
                ['carving', 'Carving / red'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3 bg-white"
                >
                  <span className="text-sm">{label}</span>
                  <input
                    type="checkbox"
                    checked={visibility[key]}
                    onChange={() =>
                      setVisibility((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Grid</div>
            <div className="grid grid-cols-2 gap-2">
              {[24, 12].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setGridSize(size)}
                  aria-pressed={gridSize === size}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    gridSize === size
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white hover:bg-neutral-50'
                  }`}
                >
                  {size} × {size}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-neutral-300 px-4 py-3 bg-white">
              <span className="text-sm">Show grid lines</span>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={() => setShowGrid((prev) => !prev)}
                className="h-4 w-4"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Drag the handles around the editor to resize individual rows and columns.
            </p>
            <button
              onClick={resetGridSizes}
              className="w-full rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Reset row and column sizes
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2">
            <button
              onClick={resetCurrentLetter}
              className="rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Reset current letter to full block
            </button>
            <button
              onClick={resetAllLetters}
              className="rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Reset all letters
            </button>
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-sm font-medium">Save / load</div>
            <button
              onClick={exportAlphabet}
              className="w-full rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Import JSON
            </button>
            <button
              onClick={restoreBackup}
              className="w-full rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Restore backup
            </button>
            <button
              onClick={clearLocalSave}
              className="w-full rounded-2xl px-4 py-3 border border-neutral-300 hover:bg-neutral-50 text-sm font-medium"
            >
              Clear local save
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importAlphabet}
              className="hidden"
            />
          </div>
        </aside>

        <main className="min-w-0 bg-white rounded-3xl shadow-sm border border-neutral-200 p-5 md:p-6">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Preview strip</div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(56px,1fr))] gap-2">
              {LETTERS.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setCurrentLetter(letter)}
                  className={`min-w-0 rounded-xl border p-1.5 transition ${
                    currentLetter === letter
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 bg-neutral-50 hover:bg-white'
                  }`}
                >
                  <SmoothGridPreview
                    grid={lettersData[letter]}
                    viewMode={viewMode}
                    visibility={visibility}
                    columnWidths={columnWidths}
                    rowHeights={rowHeights}
                    className="block w-full rounded-md overflow-hidden"
                    style={{ aspectRatio: '1 / 1' }}
                  />
                  <div className="mt-2 text-center text-xs font-medium">{letter}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Editor</div>
              <div className="text-lg font-medium">
                Drawing letter <span className="font-semibold">{currentLetter}</span>
              </div>
            </div>
            <div className="text-sm text-neutral-500">
              {gridSize} × {gridSize} grid
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500 mb-3">Smooth preview</div>
            <SmoothGridPreview
              grid={grid}
              viewMode={viewMode}
              visibility={visibility}
              columnWidths={columnWidths}
              rowHeights={rowHeights}
              className="block rounded-2xl overflow-hidden"
              style={{ width: 'min(32vw, 280px)', aspectRatio: '1 / 1' }}
            />
          </div>

          <div
            className="inline-grid gap-1 select-none"
            style={{
              gridTemplateColumns: '16px minmax(0, 1fr)',
              gridTemplateRows: '16px minmax(0, 1fr)',
              width: 'min(88vw, 860px)',
            }}
          >
            <div aria-hidden="true" />

            <div className="grid h-4" style={{ gridTemplateColumns: columnTemplate }}>
              {displayColumnWidths.map((width, index) => (
                <button
                  key={`column-handle-${index}`}
                  type="button"
                  role="slider"
                  aria-label={`Column ${index + 1} width`}
                  aria-valuemin={0.2 * (GRID / gridSize)}
                  aria-valuemax={4 * (GRID / gridSize)}
                  aria-valuenow={Number(width.toFixed(2))}
                  className="group flex min-w-0 cursor-col-resize items-center justify-center touch-none"
                  onPointerDown={(event) => startGridResize(event, 'column', index)}
                  onPointerMove={continueGridResize}
                  onPointerUp={endGridResize}
                  onPointerCancel={endGridResize}
                  onKeyDown={(event) => handleGridSizeKey(event, 'column', index)}
                >
                  <span className="h-2.5 w-px bg-neutral-400 transition group-hover:h-4 group-hover:bg-black" />
                </button>
              ))}
            </div>

            <div className="grid w-4" style={{ gridTemplateRows: rowTemplate }}>
              {displayRowHeights.map((height, index) => (
                <button
                  key={`row-handle-${index}`}
                  type="button"
                  role="slider"
                  aria-label={`Row ${index + 1} height`}
                  aria-valuemin={0.2 * (GRID / gridSize)}
                  aria-valuemax={4 * (GRID / gridSize)}
                  aria-valuenow={Number(height.toFixed(2))}
                  className="group flex min-h-0 cursor-row-resize items-center justify-center touch-none"
                  onPointerDown={(event) => startGridResize(event, 'row', index)}
                  onPointerMove={continueGridResize}
                  onPointerUp={endGridResize}
                  onPointerCancel={endGridResize}
                  onKeyDown={(event) => handleGridSizeKey(event, 'row', index)}
                >
                  <span className="h-px w-2.5 bg-neutral-400 transition group-hover:w-4 group-hover:bg-black" />
                </button>
              ))}
            </div>

            <div
              ref={drawingGridRef}
              className={`grid rounded-2xl select-none ${showGrid ? 'gap-[1px] bg-neutral-300 p-[1px]' : 'gap-0 bg-transparent p-0'}`}
              style={{
                gridTemplateColumns: columnTemplate,
                gridTemplateRows: rowTemplate,
                aspectRatio: '1 / 1',
                touchAction: 'none',
              }}
              onPointerDown={startStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
            >
              {displayGrid.map((row, y) =>
                row.map((cell, x) => (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    onClick={(event) => {
                      if (event.detail !== 0) return;
                      paintCells([{ x, y }], isCarvingCell(cell) ? 'erase' : 'paint');
                    }}
                    className="h-full min-h-0 w-full min-w-0"
                    style={{ background: getVisibleColor(cell, viewMode, visibility) }}
                    aria-label={`Cell ${x + 1}, ${y + 1}, ${isCarvingCell(cell) ? 'carving' : 'letter'}`}
                    aria-pressed={isCarvingCell(cell)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-neutral-200 p-3 bg-neutral-50">
              <div className="font-medium mb-1">Grey / letter</div>
              <div className="text-neutral-600">Base mass of the glyph, stored on the underlying 24×24 grid.</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-3 bg-neutral-50">
              <div className="font-medium mb-1">Red / carving</div>
              <div className="text-neutral-600">Subtractive cuts inside the block.</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
