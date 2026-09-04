# Content

The curriculum, as three editable JSON files. These are the source of truth — the
database stores only your progress against the item ids derived from them.

| File | What is in it |
| --- | --- |
| `components.json` | 46 building blocks, keyed by `slug` |
| `characters.json` | 60 characters, each made of two or more components |
| `words.json` | 80 words, each made of characters that appear in `characters.json` |

Field-by-field documentation, the validation rules, and how to add a level are in
the main [README](../README.md#adding-content). After editing, run:

```bash
npm run content:check
```
