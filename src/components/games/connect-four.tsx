"use client"

import React, { useState, useEffect } from "react"
import { Users, Cpu, RotateCcw, Trophy } from "lucide-react"
import { Button3D } from "react-3d-button"
import { playAmbientSound } from "@/lib/sounds"

// Play sounds helper
const playSound = (type: "click" | "success" | "swipe" | "drop") => {
  const audioMap: Record<string, string> = {
    click: "/sounds/pop-down.mp3",
    success: "/sounds/success.mp3",
    swipe: "/sounds/u_nharq4usid-swipe-255512.mp3",
    drop: "/sounds/pop-down.mp3"
  }
  playAmbientSound(audioMap[type], 0.25)
}

const ROWS = 6
const COLS = 7

type Cell = "red" | "yellow" | null

export default function ConnectFour() {
  const [board, setBoard] = useState<Cell[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  )
  const [currentPlayer, setCurrentPlayer] = useState<"red" | "yellow">("red")
  const [winner, setWinner] = useState<Cell | "draw">(null)
  const [winningCells, setWinningCells] = useState<[number, number][]>([])
  const [vsAI, setVsAI] = useState<boolean>(true)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Reset Game
  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)))
    setCurrentPlayer("red")
    setWinner(null)
    setWinningCells([])
    setIsAnimating(false)
    playSound("swipe")
  }

  // Check Win conditions
  const checkWin = (grid: Cell[][]): { winner: Cell | "draw"; cells: [number, number][] } | null => {
    // 1. Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const player = grid[r][c]
        if (player && player === grid[r][c + 1] && player === grid[r][c + 2] && player === grid[r][c + 3]) {
          return { winner: player, cells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] }
        }
      }
    }

    // 2. Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const player = grid[r][c]
        if (player && player === grid[r + 1][c] && player === grid[r + 2][c] && player === grid[r + 3][c]) {
          return { winner: player, cells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] }
        }
      }
    }

    // 3. Diagonal Down-Right
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const player = grid[r][c]
        if (player && player === grid[r + 1][c + 1] && player === grid[r + 2][c + 2] && player === grid[r + 3][c + 3]) {
          return { winner: player, cells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] }
        }
      }
    }

    // 4. Diagonal Up-Right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const player = grid[r][c]
        if (player && player === grid[r - 1][c + 1] && player === grid[r - 2][c + 2] && player === grid[r - 3][c + 3]) {
          return { winner: player, cells: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] }
        }
      }
    }

    // 5. Draw check
    let isDraw = true
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c] === null) isDraw = false
    }

    if (isDraw) return { winner: "draw", cells: [] }

    return null
  }

  // Drop disc into column with falling animation
  const dropDisc = (col: number) => {
    if (winner || isAnimating) return

    // Find lowest empty row in column
    let targetRow = -1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) {
        targetRow = r
        break
      }
    }

    if (targetRow === -1) return // Column full

    setIsAnimating(true)
    animateFall(col, 0, targetRow, currentPlayer)
  }

  // Falling animation recursion
  const animateFall = (col: number, currentRow: number, targetRow: number, player: Cell) => {
    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((row) => [...row])
      // Clear previous cell in animation path
      if (currentRow > 0) {
        newBoard[currentRow - 1][col] = null
      }
      newBoard[currentRow][col] = player
      return newBoard
    })

    playSound("drop")

    if (currentRow < targetRow) {
      setTimeout(() => {
        animateFall(col, currentRow + 1, targetRow, player)
      }, 50)
    } else {
      // Landed
      setIsAnimating(false)
      finalizeTurn(col, targetRow, player!)
    }
  }

  // Switch turn / check win
  const finalizeTurn = (col: number, row: number, player: "red" | "yellow") => {
    // Retrieve latest board
    setBoard((latestBoard) => {
      const result = checkWin(latestBoard)
      if (result) {
        setWinner(result.winner)
        setWinningCells(result.cells)
        if (result.winner !== "draw") {
          playSound("success")
        }
        return latestBoard
      }

      // No win, switch player
      const nextPlayer = player === "red" ? "yellow" : "red"
      setCurrentPlayer(nextPlayer)
      return latestBoard
    })
  }

  // Simple heuristic-based Connect 4 AI
  const runAI = () => {
    if (winner || currentPlayer !== "yellow" || isAnimating) return

    // Evaluate columns to find best move
    let bestScore = -Infinity
    let bestCols: number[] = []

    for (let c = 0; c < COLS; c++) {
      // Find lowest empty row
      let r = -1
      for (let rowIdx = ROWS - 1; rowIdx >= 0; rowIdx--) {
        if (board[rowIdx][c] === null) {
          r = rowIdx
          break
        }
      }
      if (r === -1) continue // Column full

      // Score this move
      const score = evaluateMove(r, c)
      if (score > bestScore) {
        bestScore = score
        bestCols = [c]
      } else if (score === bestScore) {
        bestCols.push(c)
      }
    }

    if (bestCols.length > 0) {
      // Select random column from best candidates
      const chosenCol = bestCols[Math.floor(Math.random() * bestCols.length)]
      setTimeout(() => {
        dropDisc(chosenCol)
      }, 400)
    }
  }

  // Trigger AI if it's Single Player and Yellow's turn
  useEffect(() => {
    if (vsAI && currentPlayer === "yellow") {
      runAI()
    }
  }, [currentPlayer, vsAI])

  // Heuristic move evaluator
  const evaluateMove = (r: number, c: number): number => {
    let score = 0

    // 1. Center column preference
    if (c === 3) score += 4

    // Helper to count matches in lines
    const evaluateLine = (cells: Cell[]): number => {
      const yellowCount = cells.filter((x) => x === "yellow").length
      const redCount = cells.filter((x) => x === "red").length
      const emptyCount = cells.filter((x) => x === null).length

      if (yellowCount === 4) return 100000 // Win
      if (redCount === 4) return -100000 // Opponent wins (doesn't happen for direct move check, but good context)
      if (yellowCount === 3 && emptyCount === 1) return 1000 // Three in a row for AI
      if (redCount === 3 && emptyCount === 1) return 5000 // Block opponent's 3-in-a-row (High priority!)
      if (yellowCount === 2 && emptyCount === 2) return 100 // Build own 2-in-a-row
      if (redCount === 2 && emptyCount === 2) return 80 // Block opponent's 2-in-a-row
      return 0
    }

    // Temporary board to test
    const testBoard = board.map((row) => [...row])
    testBoard[r][c] = "yellow"

    // Evaluate all lines passing through [r, c]
    // Horizontal check
    for (let colStart = Math.max(0, c - 3); colStart <= Math.min(COLS - 4, c); colStart++) {
      score += evaluateLine([testBoard[r][colStart], testBoard[r][colStart + 1], testBoard[r][colStart + 2], testBoard[r][colStart + 3]])
    }

    // Vertical check
    if (r <= ROWS - 4) {
      score += evaluateLine([testBoard[r][c], testBoard[r + 1][c], testBoard[r + 2][c], testBoard[r + 3][c]])
    }

    // Diagonal Down-Right check
    for (let offset = -3; offset <= 0; offset++) {
      const startR = r + offset
      const startC = c + offset
      if (startR >= 0 && startR <= ROWS - 4 && startC >= 0 && startC <= COLS - 4) {
        score += evaluateLine([
          testBoard[startR][startC],
          testBoard[startR + 1][startC + 1],
          testBoard[startR + 2][startC + 2],
          testBoard[startR + 3][startC + 3]
        ])
      }
    }

    // Diagonal Up-Right check
    for (let offset = -3; offset <= 0; offset++) {
      const startR = r - offset
      const startC = c + offset
      if (startR >= 3 && startR < ROWS && startC >= 0 && startC <= COLS - 4) {
        score += evaluateLine([
          testBoard[startR][startC],
          testBoard[startR - 1][startC + 1],
          testBoard[startR - 2][startC + 2],
          testBoard[startR - 3][startC + 3]
        ])
      }
    }

    return score
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Game Mode Selector */}
      <div className="flex gap-2 bg-[#F5F2F0] border-2 border-text-primary rounded-xl p-1 mb-2 select-none">
        <button
          onClick={() => {
            playSound("click")
            setVsAI(true)
            resetGame()
          }}
          className={`px-3 py-1 text-xs font-black rounded-lg border-2 transition-all flex items-center gap-1.5 cursor-pointer ${vsAI
              ? "bg-[#FF6B35] border-text-primary text-white shadow-[0_2px_0_#1C1B1B]"
              : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Gép ellen
        </button>
        <button
          onClick={() => {
            playSound("click")
            setVsAI(false)
            resetGame()
          }}
          className={`px-3 py-1 text-xs font-black rounded-lg border-2 transition-all flex items-center gap-1.5 cursor-pointer ${!vsAI
              ? "bg-[#FF6B35] border-text-primary text-white shadow-[0_2px_0_#1C1B1B]"
              : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
        >
          <Users className="w-3.5 h-3.5" /> 2 Játékos
        </button>
      </div>

      {/* Turn Indicator HUD */}
      <div className="w-full flex justify-between items-center bg-[#FFF8F8] border-2 border-text-primary rounded-2xl px-4 py-2 shadow-[0_3px_0_#1C1B1B] select-none">
        <span className="text-xs font-black text-text-primary">Játékos:</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full border-2 border-text-primary transition-all duration-300 ${currentPlayer === "red" ? "bg-[#EF4444]" : "bg-[#FBBF24]"
              }`}
          />
          <span className="text-xs font-black text-text-primary">
            {currentPlayer === "red" ? "Piros (Te)" : vsAI ? "Robot 🤖" : "Sárga"}
          </span>
        </div>
      </div>

      {/* Connect Four Game Board */}
      <div className="relative bg-[#3B82F6] border-4 border-text-primary rounded-[28px] p-3 shadow-[0_6px_0_#1C1B1B] select-none w-full max-w-[280px]">
        {/* Drop indicator / Column Click zones */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {Array(COLS).fill(0).map((_, c) => {
            const isColFull = board[0][c] !== null
            return (
              <button
                key={`btn-${c}`}
                disabled={!!winner || isAnimating || isColFull || (vsAI && currentPlayer === "yellow")}
                onClick={() => dropDisc(c)}
                className="aspect-square bg-[#EFF6FF] border-2 border-text-primary rounded-lg text-[10px] font-black hover:bg-[#DBCBFF] text-text-primary transition-all flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 shadow-[0_2px_0_#1C1B1B]"
              >
                ▼
              </button>
            )
          })}
        </div>

        {/* Board slots grid */}
        <div className="grid grid-cols-7 gap-1.5 bg-blue-700/80 p-2 rounded-xl">
          {board.map((row, r) =>
            row.map((cell, c) => {
              // Highlight cell if winning
              const isWinningCell = winningCells.some(([wr, wc]) => wr === r && wc === c)

              return (
                <div
                  key={`cell-${r}-${c}`}
                  className="aspect-square rounded-full border-2 border-text-primary relative overflow-hidden flex items-center justify-center transition-all bg-[#FCF9F8]"
                >
                  {cell === "red" && (
                    <div className="w-[85%] h-[85%] rounded-full bg-[#EF4444] border border-[#1C1B1B] shadow-inner" />
                  )}
                  {cell === "yellow" && (
                    <div className="w-[85%] h-[85%] rounded-full bg-[#FBBF24] border border-[#1C1B1B] shadow-inner" />
                  )}
                  {isWinningCell && (
                    <div className="absolute inset-0 border-[3px] border-white rounded-full animate-ping pointer-events-none" />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Victory Screen overlay */}
        {winner && (
          <div className="absolute inset-0 bg-white/95 border-2 border-text-primary rounded-[24px] flex flex-col items-center justify-center gap-3 p-4 z-20">
            <div className="w-12 h-12 bg-amber-100 rounded-full border-2 border-text-primary flex items-center justify-center text-[#FFB347] shadow-[0_2px_0_#1C1B1B]">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-text-primary text-center">
              {winner === "draw"
                ? "Döntetlen játék! 🤝"
                : winner === "red"
                  ? "Piros Győzött! 🎉"
                  : "Sárga Győzött! 🏆"}
            </h4>
            <p className="text-xs text-text-secondary text-center font-medium max-w-[200px]">
              {winner === "draw"
                ? "Minden hely betelt, nincs több lépés."
                : `${winner === "red" ? "Piros" : "Sárga"} összerakott 4 korongot sorban!`}
            </p>
            <button
              onClick={resetGame}
              className="px-4 py-1.5 bg-[#FF6B35] text-white border-2 border-text-primary rounded-xl font-black text-xs shadow-[0_3px_0_#1C1B1B] active:translate-y-[2px] active:shadow-[0_1px_0_#1C1B1B] transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Újraindítás
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
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
          onPress={resetGame}
        >
          <span className="font-nunito font-black text-xs text-text-primary flex items-center gap-2 justify-center">
            <RotateCcw className="w-3.5 h-3.5" /> Újraindítás
          </span>
        </Button3D>
      </div>
    </div>
  )
}
