'use client';
import { useState } from 'react';
import type { CampaignFaqItemDto } from '../../dto/challenge';
export function OfficialFaqDisclosure({ items }: { items: readonly CampaignFaqItemDto[] }) { const [open, setOpen] = useState<string | null>(null); return <div>{items.map((item) => { const expanded = open === item.id; return <div key={item.id}><h3><button className="button button-secondary" aria-expanded={expanded} aria-controls={`answer-${item.id}`} onClick={() => setOpen(expanded ? null : item.id)}>{item.question}</button></h3><div id={`answer-${item.id}`} hidden={!expanded}><p>{item.answer}</p></div></div> })}</div> }
