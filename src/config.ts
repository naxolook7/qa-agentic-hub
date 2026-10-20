import { parse } from 'yaml'
import systemPromptRaw from '../prompts/system-prompt.md?raw'
import profileRaw from '../profile.yaml?raw'
import type { Vars } from './agents/composer'

interface Profile {
  hub: { name: string; dataRepo?: string }
  vars: Vars
}

const profile = parse(profileRaw) as Profile

export const HUB_NAME = profile.hub.name
export const DATA_REPO = profile.hub.dataRepo ?? ''
export const VARS: Vars = Object.fromEntries(Object.entries(profile.vars).map(([k, v]) => [k, String(v ?? '')]))
export const SYSTEM_PROMPT = systemPromptRaw
