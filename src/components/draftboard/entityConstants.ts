import { User, MapPin, Package } from 'lucide-react'
import type { EntityType } from '@/api/entities'

export const BADGE_ICONS: Record<EntityType, typeof User> = {
  character: User,
  location: MapPin,
  item: Package,
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  character: 'Person',
  location: 'Location',
  item: 'Item',
}

export const ENTITY_BADGE_COLORS: Record<EntityType, { border: string; bg: string; text: string }> = {
  character: {
    border: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.05)',
    text: '#7c3aed',
  },
  location: {
    border: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.05)',
    text: '#0d9488',
  },
  item: {
    border: '#b45309',
    bg: 'rgba(180, 83, 9, 0.05)',
    text: '#b45309',
  },
}

export const ENTITY_CHIP_COLORS: Record<EntityType, string> = {
  character: '#7c3aed',
  location: '#0d9488',
  item: '#b45309',
}
