import { describe, expect, it } from 'vitest'
import {
  normalizeRecipe,
  normalizeNameKey,
  parseIngredientLine,
  parseRecipeIngredients,
  parseRecipePaste,
  parseRecipeSteps,
  stripStepPrefix,
} from './recipes'
import { guessShoppingCategory, normalizeShoppingItem } from './shopping'
import { toCanonical } from './units'

describe('recipes normalize', () => {
  it('requires id and title', () => {
    expect(normalizeRecipe({ id: 'a', title: '' })).toBeNull()
    expect(normalizeRecipe({ title: 'Soup' })).toBeNull()
  })

  it('canonicalizes ingredient amounts', () => {
    const r = normalizeRecipe({
      id: 'r1',
      title: 'Test',
      cuisine: 'Home',
      servings: 4,
      mainIngredients: ['chicken'],
      ingredients: [
        {
          id: 'i1',
          name: 'Chicken',
          amount: 1,
          unit: 'lb',
          unitKind: 'mass',
          scalable: true,
        },
      ],
      steps: ['Cook'],
      favoriteUids: [],
      cookedCount: 0,
      lastCookedAt: null,
      createdAt: 1,
      updatedAt: 1,
    })
    expect(r).not.toBeNull()
    expect(r!.tags).toEqual([])
    expect(r!.ingredients[0]!.unit).toBe('g')
    expect(r!.ingredients[0]!.amount).toBeCloseTo(
      toCanonical(1, 'lb', 'mass').amount,
      2,
    )
  })

  it('normalizes freeform tags', () => {
    const r = normalizeRecipe({
      id: 'r2',
      title: 'Tagged',
      cuisine: '',
      servings: 2,
      mainIngredients: [],
      tags: ['  Weeknight ', 'meal prep', 'weeknight', '', 3],
      ingredients: [],
      steps: ['Mix'],
      favoriteUids: [],
      cookedCount: 0,
      lastCookedAt: null,
      createdAt: 1,
      updatedAt: 1,
    })
    expect(r).not.toBeNull()
    expect(r!.tags).toEqual(['Weeknight', 'meal prep'])
  })

  it('normalizeNameKey collapses spaces', () => {
    expect(normalizeNameKey('  Green  Onion ')).toBe('green onion')
  })
})

describe('parseRecipeSteps', () => {
  it('strips numbered and bullet prefixes', () => {
    expect(stripStepPrefix('1. Preheat oven')).toBe('Preheat oven')
    expect(stripStepPrefix('- Mix flour')).toBe('Mix flour')
    expect(stripStepPrefix('• Whisk eggs')).toBe('Whisk eggs')
    expect(stripStepPrefix('Step 2: Bake')).toBe('Bake')
  })

  it('splits newlines and strips markers', () => {
    expect(
      parseRecipeSteps('1. Preheat\n2. Mix batter\n- Bake until golden'),
    ).toEqual(['Preheat', 'Mix batter', 'Bake until golden'])
  })

  it('splits inline numbered lists', () => {
    expect(
      parseRecipeSteps('1. Preheat oven. 2. Mix flour. 3. Bake 20 min.'),
    ).toEqual(['Preheat oven.', 'Mix flour.', 'Bake 20 min.'])
  })

  it('splits hyphen bullet runs', () => {
    expect(parseRecipeSteps('Chop onion - Saute garlic - Add rice')).toEqual([
      'Chop onion',
      'Saute garlic',
      'Add rice',
    ])
  })

  it('splits sentences in a paragraph', () => {
    expect(
      parseRecipeSteps(
        'Preheat the oven to 400. Mix the dry ingredients. Bake until golden.',
      ),
    ).toEqual([
      'Preheat the oven to 400.',
      'Mix the dry ingredients.',
      'Bake until golden.',
    ])
  })
})

describe('parseRecipeIngredients', () => {
  it('parses pork-chop style list', () => {
    const rows = parseRecipeIngredients(`1 pork chop
~½ tsp salt
~½ tsp black pepper
~½ tsp garlic powder
~½ tsp paprika
~¼ tsp onion powder
1–2 tbsp grated Parmesan
1 tbsp neutral oil
1 tbsp butter
Optional: 1 minced garlic clove`)
    expect(rows[0]).toMatchObject({
      name: 'pork chop',
      amount: 1,
      unitKind: 'count',
    })
    expect(rows[1]).toMatchObject({
      name: 'salt',
      amount: 0.5,
      unit: 'tsp',
      unitKind: 'volume',
    })
    expect(rows[5]).toMatchObject({
      name: 'onion powder',
      amount: 0.25,
      unit: 'tsp',
    })
    expect(rows[6]).toMatchObject({
      name: 'grated Parmesan',
      amount: 1,
      unit: 'tbsp',
    })
    expect(rows[9]).toMatchObject({
      name: 'minced garlic (optional)',
      amount: 1,
      unit: 'clove',
      unitKind: 'count',
    })
  })

  it('parses bare names', () => {
    expect(parseIngredientLine('salt')).toMatchObject({
      name: 'salt',
      amount: 1,
      unitKind: 'count',
    })
  })
})

describe('parseRecipePaste', () => {
  it('splits ingredients block from steps block', () => {
    const { ingredients, steps } = parseRecipePaste(`1 pork chop
~½ tsp salt
1 tbsp butter

Pat the pork dry. This helps it brown.
Season both sides. Press into the meat.
Heat a skillet over medium-high until hot.`)
    expect(ingredients.length).toBeGreaterThanOrEqual(3)
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(ingredients[0]!.name).toMatch(/pork/i)
    expect(steps[0]!.toLowerCase()).toContain('pat')
  })
})

describe('shopping', () => {
  it('guesses meat category', () => {
    expect(guessShoppingCategory('chicken thighs')).toBe('meat')
  })

  it('normalizes items', () => {
    const item = normalizeShoppingItem({
      id: 's1',
      name: 'Milk',
      category: 'dairy',
      completed: false,
      addedBy: 'u1',
      source: 'manual',
      createdAt: 1,
    })
    expect(item?.category).toBe('dairy')
  })
})
