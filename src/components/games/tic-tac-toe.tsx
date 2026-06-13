"use client"

import React, { useState, useEffect } from "react"
import { Users, Cpu, RotateCcw, Trophy } from "lucide-react"
import { Button3D } from "react-3d-button"
import { playAmbientSound } from "@/lib/sounds"

// Sounds helper
const playSound = (type: "click" | "success" | "swipe" | "draw") => {
  const audioMap: Record<string, string> = {
    click: "/sounds/pop-down.mp3",
    success: "/sounds/success.mp3",
    swipe: "/sounds/u_nharq4usid-swipe-255512.mp3",
    draw: "/sounds/pop-down.mp3"
  }
  playAmbientSound(audioMap[type], 0.25)
}

type CellValue = "X" | "O" | null

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
]

const getLineCoords = (idx: number) => {
  switch (idx) {
    case 0: return { x1: 6, y1: 16.67, x2: 94, y2: 16.67 } // Row 0
    case 1: return { x1: 6, y1: 50, x2: 94, y2: 50 }    // Row 1
    case 2: return { x1: 6, y1: 83.33, x2: 94, y2: 83.33 } // Row 2
    case 3: return { x1: 16.67, y1: 6, x2: 16.67, y2: 94 } // Col 0
    case 4: return { x1: 50, y1: 6, x2: 50, y2: 94 }    // Col 1
    case 5: return { x1: 83.33, y1: 6, x2: 83.33, y2: 94 } // Col 2
    case 6: return { x1: 10, y1: 10, x2: 90, y2: 90 }    // Diagonal 0-4-8
    case 7: return { x1: 90, y1: 10, x2: 10, y2: 90 }    // Diagonal 2-4-6
    default: return { x1: 0, y1: 0, x2: 0, y2: 0 }
  }
}

export default function TicTacToe() {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X")
  const [winner, setWinner] = useState<CellValue | "draw">(null)
  const [winningLine, setWinningLine] = useState<number[]>([])
  const [winningLineIdx, setWinningLineIdx] = useState<number | null>(null)
  const [showWinnerOverlay, setShowWinnerOverlay] = useState<boolean>(false)
  const [vsAI, setVsAI] = useState<boolean>(true)
  const [isThinking, setIsThinking] = useState<boolean>(false)

  const [aiMode, setAiMode] = useState<"perfect" | "imperfect">(() => Math.random() < 0.4 ? "imperfect" : "perfect")

  // Reset Game
  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer("X")
    setWinner(null)
    setWinningLine([])
    setWinningLineIdx(null)
    setShowWinnerOverlay(false)
    setIsThinking(false)
    setAiMode(Math.random() < 0.4 ? "imperfect" : "perfect")
    playSound("swipe")
  }

  // Check Winner Helper
  const checkWinner = (squares: CellValue[]) => {
    for (let i = 0; i < WIN_LINES.length; i++) {
      const [a, b, c] = WIN_LINES[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: WIN_LINES[i], lineIdx: i }
      }
    }
    if (squares.every((square) => square !== null)) {
      return { winner: "draw" as const, line: [], lineIdx: null }
    }
    return null
  }

  // Click handler
  const handleCellClick = (index: number) => {
    if (board[index] || winner || isThinking || (vsAI && currentPlayer === "O")) return

    playSound("click")
    const nextBoard = [...board]
    nextBoard[index] = currentPlayer
    setBoard(nextBoard)

    const result = checkWinner(nextBoard)
    if (result) {
      setWinner(result.winner)
      setWinningLine(result.line)
      setWinningLineIdx(result.lineIdx)
      if (result.winner !== "draw") {
        playSound("success")
        setTimeout(() => {
          setShowWinnerOverlay(true)
        }, 1200)
      } else {
        setTimeout(() => {
          setShowWinnerOverlay(true)
        }, 600)
      }
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X")
    }
  }

  // Minimax algorithm score check
  const evaluateBoard = (squares: CellValue[]): number => {
    for (const line of WIN_LINES) {
      const [a, b, c] = line
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a] === "O" ? 10 : -10
      }
    }
    return 0
  }

  // Minimax function
  const minimax = (squares: CellValue[], depth: number, isMax: boolean): number => {
    const score = evaluateBoard(squares)
    if (score === 10) return score - depth
    if (score === -10) return score + depth
    if (squares.every((s) => s !== null)) return 0

    if (isMax) {
      let best = -Infinity
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "O"
          best = Math.max(best, minimax(squares, depth + 1, false))
          squares[i] = null
        }
      }
      return best
    } else {
      let best = Infinity
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "X"
          best = Math.min(best, minimax(squares, depth + 1, true))
          squares[i] = null
        }
      }
      return best
    }
  }

  // Let AI make move
  const runAI = () => {
    if (winner || currentPlayer !== "O") return

    setIsThinking(true)

    // Find all legal moves
    const availableMoves: number[] = []
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        availableMoves.push(i)
      }
    }

    if (availableMoves.length === 0) {
      setIsThinking(false)
      return
    }

    let selectedMove = -1
    const isImperfect = aiMode === "imperfect"
    const makeMistake = isImperfect && Math.random() < 0.35

    if (makeMistake) {
      // Pick a random move
      selectedMove = availableMoves[Math.floor(Math.random() * availableMoves.length)]
    } else {
      // Run minimax on available spots
      let bestVal = -Infinity
      let bestMoves: number[] = []

      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          const nextBoard = [...board]
          nextBoard[i] = "O"
          const moveVal = minimax(nextBoard, 0, false)
          nextBoard[i] = null

          if (moveVal > bestVal) {
            bestVal = moveVal
            bestMoves = [i]
          } else if (moveVal === bestVal) {
            bestMoves.push(i)
          }
        }
      }

      if (bestMoves.length > 0) {
        selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)]
      }
    }

    // Drop move
    if (selectedMove !== -1) {
      setTimeout(() => {
        playSound("click")
        const nextBoard = [...board]
        nextBoard[selectedMove] = "O"
        setBoard(nextBoard)
        setIsThinking(false)

        const result = checkWinner(nextBoard)
        if (result) {
          setWinner(result.winner)
          setWinningLine(result.line)
          setWinningLineIdx(result.lineIdx)
          if (result.winner !== "draw") {
            playSound("success")
            setTimeout(() => {
              setShowWinnerOverlay(true)
            }, 1200)
          } else {
            setTimeout(() => {
              setShowWinnerOverlay(true)
            }, 600)
          }
        } else {
          setCurrentPlayer("X")
        }
      }, 500)
    } else {
      setIsThinking(false)
    }
  }

  // Trigger AI turn
  useEffect(() => {
    if (vsAI && currentPlayer === "O") {
      runAI()
    }
  }, [currentPlayer, vsAI])

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
              ? "bg-[#8B5CF6] border-text-primary text-white shadow-[0_2px_0_#1C1B1B]"
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
              ? "bg-[#8B5CF6] border-text-primary text-white shadow-[0_2px_0_#1C1B1B]"
              : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
        >
          <Users className="w-3.5 h-3.5" /> 2 Játékos
        </button>
      </div>

      {/* Turn Indicator HUD */}
      <div className="w-full flex justify-between items-center bg-[#FFF8F8] border-2 border-text-primary rounded-2xl px-4 py-2 shadow-[0_3px_0_#1C1B1B] select-none">
        <span className="text-xs font-black text-text-primary">Soron következő:</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-black transition-all ${currentPlayer === "X" ? "text-[#EF4444]" : "text-[#3B82F6]"
              }`}
          >
            {currentPlayer === "X" ? "X" : "O"}
          </span>
          <span className="text-xs font-black text-text-primary">
            ({currentPlayer === "X" ? "Piros" : vsAI ? "Robot 🤖" : "Kék"})
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-[#1C1B1B] border-4 border-text-primary rounded-[28px] p-3 shadow-[0_6px_0_#1C1B1B] relative select-none w-full max-w-[280px] aspect-square grid grid-cols-3 grid-rows-3 gap-2">
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes drawSVGLine {
            from {
              stroke-dashoffset: 150;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .animate-svg-line {
            stroke-dasharray: 150;
            stroke-dashoffset: 150;
            animation: drawSVGLine 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}} />

        {board.map((cell, i) => {
          const isWinningCell = winningLine.includes(i)

          return (
            <div
              key={`cell-${i}`}
              onClick={() => handleCellClick(i)}
              className={`bg-white border-2 border-text-primary rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_4px_0_#1C1B1B] active:translate-y-[3px] active:shadow-[0_1px_0_#1C1B1B] transition-all cursor-pointer relative overflow-hidden`}
              style={{
                backgroundColor: isWinningCell ? "#FDE68A" : "#FFFFFF",
              }}
            >
              {/* Top capsule shine for 3D effect */}
              <div className="absolute top-1 left-1 right-1 h-1.5 bg-white/25 rounded-t-lg pointer-events-none" />

              {cell === "X" && (
                <span
                  className="text-[#EF4444] font-black text-5xl select-none"
                  style={{ textShadow: "0 4px 0 #1C1B1B" }}
                >
                  X
                </span>
              )}
              {cell === "O" && (
                <span
                  className="text-[#3B82F6] font-black text-5xl select-none"
                  style={{ textShadow: "0 4px 0 #1C1B1B" }}
                >
                  O
                </span>
              )}
            </div>
          )
        })}

        {/* Dynamic Winner Line Drawing Overlay */}
        {winningLineIdx !== null && (() => {
          const coords = getLineCoords(winningLineIdx)
          return (
            <svg
              className="absolute inset-3 pointer-events-none z-30 w-[calc(100%-24px)] h-[calc(100%-24px)]"
              viewBox="0 0 100 100"
            >
              {/* 3D Drop Shadow Line */}
              <line
                x1={coords.x1 + 0.6}
                y1={coords.y1 + 0.8}
                x2={coords.x2 + 0.6}
                y2={coords.y2 + 0.8}
                stroke="#1C1B1B"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="animate-svg-line"
              />
              {/* Main Colored Line (Red for X, Blue for O) */}
              <line
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke={winner === "X" ? "#EF4444" : "#3B82F6"}
                strokeWidth="2.8"
                strokeLinecap="round"
                className="animate-svg-line"
              />
              {/* White Top Shine Highlight Line */}
              <line
                x1={coords.x1 - 0.3}
                y1={coords.y1 - 0.4}
                x2={coords.x2 - 0.3}
                y2={coords.y2 - 0.4}
                stroke="#FFFFFF"
                strokeWidth="0.8"
                strokeLinecap="round"
                className="animate-svg-line"
              />
            </svg>
          )
        })()}

        {/* Winner Dialog Screen Overlay inside board */}
        {showWinnerOverlay && winner && (
          <div className="absolute inset-0 bg-white/95 border-2 border-text-primary rounded-[24px] flex flex-col items-center justify-center gap-3 p-4 z-40">
            <div className="w-12 h-12 bg-amber-100 rounded-full border-2 border-text-primary flex items-center justify-center text-[#FFB347] shadow-[0_2px_0_#1C1B1B]">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-text-primary text-center">
              {winner === "draw"
                ? "Döntetlen! 🤝"
                : `${winner} nyert! 🎉`}
            </h4>
            <p className="text-xs text-text-secondary text-center font-medium max-w-[200px]">
              {winner === "draw"
                ? "Mind a 9 mezőt kijátszottátok!"
                : `${winner === "X" ? "Piros (X)" : "Kék (O)"} sikeresen kirakott egy hármast!`}
            </p>
            <button
              onClick={resetGame}
              className="px-4 py-1.5 bg-[#FF6B35] text-white border-2 border-text-primary rounded-xl font-black text-xs shadow-[0_3px_0_#1C1B1B] active:translate-y-[2px] active:shadow-[0_1px_0_#1C1B1B] transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Új Játék
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
