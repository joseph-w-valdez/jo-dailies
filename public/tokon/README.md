# Tokon assets

Drop art here. Filenames must match `portraitFile` in `src/data/tokonRoster.ts`.

## Portraits

`portraits/{filename}` — examples:

```
portraits/captain_america.png
portraits/spider-man.png
portraits/star-lord.png
portraits/ms_marvel.png
portraits/champion.png
```

Refresh the browser after adding files (folder is unwatched in dev to avoid Windows EBUSY crashes).

## Team badges (optional)

`teams/{team-id}.webp`

## Button icons

Official-style prompts and numpad icons from the [Dustloop MTFS wiki](https://www.dustloop.com/w/MTFS/Mechanics) (community uploads, same art used in combo tables).

```
buttons/prompts/l.png      Light
buttons/prompts/m.png      Medium
buttons/prompts/h.png      Heavy
buttons/prompts/a.png      Assemble (assist)
buttons/prompts/t.png      Tag
buttons/prompts/u.png      Unique
buttons/prompts/qs.png     Quick Skill
buttons/prompts/qa.png     Quick Assemble
buttons/prompts/qd.png     Quick Dash

buttons/directions/1.png … 9.png   Numpad (1=down-back … 9=up-forward, 5=neutral)

buttons/motions/236.png    Quarter-circle forward
buttons/motions/623.png    Dragon punch
buttons/motions/214.png    Quarter-circle back
… (other compound motion icons in motions/)
```

Source URLs look like `https://www.dustloop.com/wiki/images/…/MTFS_L_Prompt.png` and `InputIcon_*.png`. Re-download with the script in repo history or Dustloop’s MediaWiki API (`list=allimages`, prefix `MTFS_` / `InputIcon`).
