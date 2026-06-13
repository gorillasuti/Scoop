"use client"

import React, { useState, useEffect, useRef } from "react"
import { Play, RotateCcw, Cpu, Sparkles, Trophy } from "lucide-react"
import { Button3D } from "react-3d-button"
import { playAmbientSound } from "@/lib/sounds"

// Sounds helper
const playSound = (type: "click" | "success" | "swipe" | "radio") => {
  const audioMap: Record<string, string> = {
    click: "/sounds/pop-down.mp3",
    success: "/sounds/success.mp3",
    swipe: "/sounds/u_nharq4usid-swipe-255512.mp3",
    radio: "/sounds/radio_select.mp3"
  }
  playAmbientSound(audioMap[type], 0.2)
}

interface SlidingPuzzleProps {
  initialSize?: 3 | 4
}

export default function SlidingPuzzle({ initialSize = 3 }: SlidingPuzzleProps) {
  const [size, setSize] = useState<number>(initialSize)
  const [board, setBoard] = useState<number[]>([])
  const [moves, setMoves] = useState<number>(0)
  const [isWon, setIsWon] = useState<boolean>(false)
  const [timer, setTimer] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [solving, setSolving] = useState<boolean>(false)
  const [solverMovesLeft, setSolverMovesLeft] = useState<number>(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Start timer
  useEffect(() => {
    if (isRunning && !isWon) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, isWon])

  // Cleanup auto play on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current)
    }
  }, [])

  // Initialize board
  const initializeGame = (gridSize: number) => {
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current)
    setSolving(false)
    setSolverMovesLeft(0)

    let newBoard: number[] = []
    const totalTiles = gridSize * gridSize

    // Create goal board
    for (let i = 1; i < totalTiles; i++) {
      newBoard.push(i)
    }
    newBoard.push(0) // Empty tile represented by 0

    // Shuffle and check solvability
    let shuffled: number[] = []
    let solvable = false

    while (!solvable) {
      shuffled = [...newBoard].sort(() => Math.random() - 0.5)
      solvable = isSolvable(shuffled, gridSize) && !isAlreadySolved(shuffled, gridSize)
    }

    setBoard(shuffled)
    setMoves(0)
    setIsWon(false)
    setTimer(0)
    setIsRunning(true)
  }

  // Check if grid is solved
  const isAlreadySolved = (arr: number[], gridSize: number) => {
    const total = gridSize * gridSize
    for (let i = 0; i < total - 1; i++) {
      if (arr[i] !== i + 1) return false
    }
    return arr[total - 1] === 0
  }

  // Solvability check algorithm for sliding puzzles
  const isSolvable = (puzzle: number[], gridSize: number) => {
    let parity = 0
    const gridWidth = gridSize
    const row = Math.floor(puzzle.indexOf(0) / gridWidth) // 0-indexed from top

    for (let i = 0; i < puzzle.length; i++) {
      if (puzzle[i] === 0) continue
      for (let j = i + 1; j < puzzle.length; j++) {
        if (puzzle[j] === 0) continue
        if (puzzle[i] > puzzle[j]) {
          parity++
        }
      }
    }

    if (gridWidth % 2 === 1) {
      return parity % 2 === 0
    } else {
      return (parity + row) % 2 === 1
    }
  }

  // Setup board on load
  useEffect(() => {
    initializeGame(size)
  }, [size])

  // Move tile
  const moveTile = (index: number) => {
    if (isWon || solving) return

    const emptyIndex = board.indexOf(0)
    const row = Math.floor(index / size)
    const col = index % size
    const emptyRow = Math.floor(emptyIndex / size)
    const emptyCol = emptyIndex % size

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow)

    if (isAdjacent) {
      playSound("click")
      const newBoard = [...board]
      newBoard[emptyIndex] = board[index]
      newBoard[index] = 0

      setBoard(newBoard)
      setMoves((m) => m + 1)

      // Check win
      if (isAlreadySolved(newBoard, size)) {
        setIsWon(true)
        setIsRunning(false)
        playSound("success")
      }
    }
  }

  // A* Search Solver for 3x3 Puzzle
  const runAStarSolver = () => {
    if (size !== 3) return
    setSolving(true)
    playSound("radio")

    const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0]

    // Node class for priority queue
    class PuzzleNode {
      board: number[]
      g: number // moves count
      h: number // manhattan distance
      f: number // g + h
      emptyIdx: number
      parent: PuzzleNode | null

      constructor(board: number[], g: number, parent: PuzzleNode | null) {
        this.board = board
        this.g = g
        this.emptyIdx = board.indexOf(0)
        this.parent = parent
        this.h = this.getManhattanDistance()
        this.f = this.g + this.h
      }

      getManhattanDistance() {
        let dist = 0
        for (let i = 0; i < 9; i++) {
          const val = this.board[i]
          if (val !== 0) {
            const targetRow = Math.floor((val - 1) / 3)
            const targetCol = (val - 1) % 3
            const currRow = Math.floor(i / 3)
            const currCol = i % 3
            dist += Math.abs(targetRow - currRow) + Math.abs(targetCol - currCol)
          }
        }
        return dist
      }
    }

    // A* implementation
    const openSet: PuzzleNode[] = []
    const closedSet = new Set<string>()

    const startNode = new PuzzleNode(board, 0, null)
    openSet.push(startNode)

    let iterations = 0
    let solutionNode: PuzzleNode | null = null

    while (openSet.length > 0 && iterations < 3000) {
      iterations++
      // Sort openSet by f score
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      if (current.board.join(",") === goal.join(",")) {
        solutionNode = current
        break
      }

      closedSet.add(current.board.join(","))

      // Neighbors directions
      const r = Math.floor(current.emptyIdx / 3)
      const c = current.emptyIdx % 3
      const movesDirections = [
        { r: r - 1, c }, // Up
        { r: r + 1, c }, // Down
        { r, c: c - 1 }, // Left
        { r, c: c + 1 }  // Right
      ]

      for (const move of movesDirections) {
        if (move.r >= 0 && move.r < 3 && move.c >= 0 && move.c < 3) {
          const neighborIdx = move.r * 3 + move.c
          const nextBoard = [...current.board]
          nextBoard[current.emptyIdx] = nextBoard[neighborIdx]
          nextBoard[neighborIdx] = 0

          if (!closedSet.has(nextBoard.join(","))) {
            const neighborNode = new PuzzleNode(nextBoard, current.g + 1, current)
            // Check if already in openSet with better score
            const existingNode = openSet.find((node) => node.board.join(",") === nextBoard.join(","))
            if (!existingNode || existingNode.g > neighborNode.g) {
              openSet.push(neighborNode)
            }
          }
        }
      }
    }

    if (solutionNode) {
      // Backtrack path
      const path: number[][] = []
      let curr: PuzzleNode | null = solutionNode
      while (curr !== null) {
        path.push(curr.board)
        curr = curr.parent
      }
      path.reverse() // from start state to end state

      // Animate moves
      setSolverMovesLeft(path.length - 1)
      animateSolverMoves(path, 1)
    } else {
      setSolving(false)
      alert("Hoppá! Nem sikerült megoldást találni.")
    }
  }

  const animateSolverMoves = (path: number[][], step: number) => {
    if (step >= path.length) {
      setIsWon(true)
      setIsRunning(false)
      setSolving(false)
      setSolverMovesLeft(0)
      playSound("success")
      return
    }

    autoPlayTimeoutRef.current = setTimeout(() => {
      playSound("click")
      setBoard(path[step])
      setMoves((m) => m + 1)
      setSolverMovesLeft(path.length - 1 - step)
      animateSolverMoves(path, step + 1)
    }, 250)
  }

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Settings Options */}
      <div className="flex gap-2 bg-[#F5F2F0] border-2 border-text-primary rounded-xl p-1 mb-2">
        <button
          onClick={() => {
            playSound("click")
            setSize(3)
          }}
          className={`px-3 py-1 text-xs font-black rounded-lg border-2 transition-all cursor-pointer ${size === 3
            ? "bg-[#60A5FA] border-text-primary text-text-primary shadow-[0_2px_0_#1C1B1B]"
            : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
        >
          3x3 (8-as)
        </button>
        <button
          onClick={() => {
            playSound("click")
            setSize(4)
          }}
          className={`px-3 py-1 text-xs font-black rounded-lg border-2 transition-all cursor-pointer ${size === 4
            ? "bg-[#60A5FA] border-text-primary text-text-primary shadow-[0_2px_0_#1C1B1B]"
            : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
        >
          4x4 (15-ös)
        </button>
      </div>

      {/* Grid HUD */}
      <div className="w-full flex justify-between gap-4 px-2 select-none">
        <div className="bg-[#FFF5F5] border-2 border-text-primary rounded-2xl px-4 py-2 flex flex-col items-center flex-1 shadow-[0_3px_0_#1C1B1B]">
          <span className="text-[9px] text-text-secondary font-black tracking-wider uppercase">Lépések</span>
          <span className="text-sm font-black text-text-primary">{moves}</span>
        </div>
        <div className="bg-[#E9F5FE] border-2 border-text-primary rounded-2xl px-4 py-2 flex flex-col items-center flex-1 shadow-[0_3px_0_#1C1B1B]">
          <span className="text-[9px] text-text-secondary font-black tracking-wider uppercase">Idő</span>
          <span className="text-sm font-black text-text-primary">{formatTime(timer)}</span>
        </div>
      </div>

      {/* Main Board Container */}
      <div
        className="bg-[#1C1B1B] border-4 border-text-primary rounded-[28px] p-3 shadow-[0_6px_0_#1C1B1B] relative select-none w-full max-w-[280px] aspect-square"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`,
          gap: "8px",
        }}
      >
        {board.map((tile, i) => {
          if (tile === 0) {
            return <div key={`empty-${i}`} className="bg-transparent rounded-xl" />
          }

          // Tile colors map
          let color = ""
          if (size === 3) {
            if (tile === 1 || tile === 4 || tile === 7) {
              color = "#60A5FA" // blue
            } else if (tile === 2 || tile === 5 || tile === 8) {
              color = "#10B981" // green
            } else if (tile === 3 || tile === 6) {
              color = "#8B5CF6" // purple
            } else {
              color = "#FF6B35"
            }
          } else {
            const colors = ["#FF6B35", "#60A5FA", "#10B981", "#8B5CF6"]
            color = colors[tile % colors.length]
          }

          return (
            <div
              key={tile}
              onClick={() => moveTile(i)}
              className="bg-white border-4 border-text-primary rounded-2xl flex items-center justify-center font-black text-lg shadow-[0_5px_0_#1C1B1B] active:translate-y-[4px] active:shadow-[0_1px_0_#1C1B1B] transition-all cursor-pointer relative overflow-hidden"
              style={{
                background: color,
                color: "#FFFFFF",
              }}
            >
              {/* Top shine reflection for 3D effect */}
              <div className="absolute top-1 left-1 right-1 h-2 bg-white/25 rounded-t-lg pointer-events-none" />
              <span className="relative z-10" style={{ textShadow: "0 2.5px 0 #1C1B1B" }}>
                {tile}
              </span>
            </div>
          )
        })}

        {/* Victory Screen Modal inside board */}
        {isWon && (
          <div className="absolute inset-0 bg-white/95 border-2 border-text-primary rounded-[24px] flex flex-col items-center justify-center gap-3 p-4 z-20">
            <div className="w-12 h-12 bg-amber-100 rounded-full border-2 border-text-primary flex items-center justify-center text-[#FFB347] shadow-[0_2px_0_#1C1B1B]">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-text-primary text-center">Gratulálunk! 🎉</h4>
            <p className="text-xs text-text-secondary text-center font-medium max-w-[200px]">
              {moves} lépéssel és {formatTime(timer)} idővel sikeresen kiraktad a kirakót!
            </p>
            <button
              onClick={() => initializeGame(size)}
              className="px-4 py-1.5 bg-[#FF6B35] text-white border-2 border-text-primary rounded-xl font-black text-xs shadow-[0_3px_0_#1C1B1B] active:translate-y-[2px] active:shadow-[0_1px_0_#1C1B1B] transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Új Játék
            </button>
          </div>
        )}
      </div>

      {/* Game Controller Buttons */}
      <div className="w-full flex gap-3 px-2">
        <Button3D
          type="secondary"
          rounded="xl"
          containerProps={{
            style: {
              flex: 1,
              height: "42px",
              "--button-secondary-color": "#FFFFFF",
              "--button-secondary-color-dark": "#E5E2E1",
              "--button-secondary-color-hover": "#FCF9F8",
              "--button-secondary-color-light": "#1C1B1B",
            } as React.CSSProperties
          }}
          onPress={() => {
            playSound("swipe")
            initializeGame(size)
          }}
        >
          <span className="font-nunito font-black text-xs text-text-primary flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Keverés
          </span>
        </Button3D>

        {size === 3 && (
          <Button3D
            type="primary"
            rounded="xl"
            disabled={solving || isWon}
            containerProps={{
              style: {
                flex: 1.2,
                height: "42px",
                "--button-primary-color": "#8B5CF6",
                "--button-primary-color-dark": "#7C3AED",
                "--button-primary-color-hover": "#9D70FF",
                "--button-primary-color-light": "#FFFFFF",
              } as React.CSSProperties
            }}
            onPress={runAStarSolver}
          >
            <span className="font-nunito font-black text-xs text-white flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              {solving ? `Megoldás (${solverMovesLeft})..` : "Gépi Megoldó"}
            </span>
          </Button3D>
        )}
      </div>
    </div>
  )
}
