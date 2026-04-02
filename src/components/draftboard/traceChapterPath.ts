import type { BoardCard, StoryPath } from '@/api/draftboard'

export function traceChapterPath(cards: BoardCard[], paths: StoryPath[]): BoardCard[] {
  // Filter to chapter-linked cards only
  const chapterCards = cards.filter(c => c.chapterId)

  if (chapterCards.length === 0) {
    return []
  }

  // Build adjacency map for all cards (including non-chapter cards as waypoints)
  const adjacencyMap = new Map<string, string[]>()
  paths.forEach(path => {
    if (!adjacencyMap.has(path.fromCardId)) {
      adjacencyMap.set(path.fromCardId, [])
    }
    adjacencyMap.get(path.fromCardId)!.push(path.toCardId)
  })

  // Compute in-degree per card
  const inDegree = new Map<string, number>()
  cards.forEach(card => {
    if (!inDegree.has(card.id)) {
      inDegree.set(card.id, 0)
    }
  })
  paths.forEach(path => {
    inDegree.set(path.toCardId, (inDegree.get(path.toCardId) ?? 0) + 1)
  })

  // Find start nodes (in-degree 0), prioritise chapter-linked cards
  const startNodes = chapterCards.filter(c => inDegree.get(c.id) === 0)

  // DFS walk from each start node, collecting chapter-linked cards in order
  const visited = new Set<string>()
  const orderedChapterCards: BoardCard[] = []
  const cardMap = new Map(cards.map(c => [c.id, c]))

  const dfs = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const card = cardMap.get(nodeId)
    if (card && card.chapterId) {
      orderedChapterCards.push(card)
    }

    // Visit adjacent cards
    const neighbors = adjacencyMap.get(nodeId) ?? []
    neighbors.forEach(neighborId => dfs(neighborId))
  }

  // Start from each start node
  startNodes.forEach(startNode => dfs(startNode.id))

  // Append any unreached chapter-linked cards (disconnected components)
  chapterCards.forEach(card => {
    if (!visited.has(card.id)) {
      orderedChapterCards.push(card)
    }
  })

  return orderedChapterCards
}
