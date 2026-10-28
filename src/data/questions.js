// Question bank — SOURCE OF TRUTH FOR THE DATABASE SEED ONLY.
//
// This file contains the correct answers, so it must never be imported by the
// browser bundle. Run `npm run seed:sql` to turn it into a Supabase migration;
// at runtime players only ever receive questions through the
// `get_current_question` function (without the answer) and the answer arrives
// through `rooms.reveal` after the host reveals the round.
//
// Shape: { id, category, text, code?, language?, options[], correct, explanation, difficulty }
//   category   : 'spot-the-bug' | 'cursed-output' | 'bug-or-bluff' | 'ui-monster'
//   language   : 'javascript' | 'html' | 'css' | 'vue'   (for syntax highlighting)
//   correct    : index into options
//   difficulty : 'easy' | 'medium' | 'hard'

export const questions = [
  // ------------------------------------------------------------ Spot the Bug 🐛
  {
    id: 'bug-01',
    category: 'spot-the-bug',
    text: "What's the bug?",
    code: 'const spooky = true;\nspooky = false;',
    language: 'javascript',
    options: ['Missing semicolon', 'Reassigning a const variable', 'Incorrect Boolean syntax', 'No bug'],
    correct: 1,
    explanation: 'A `const` binding cannot be reassigned. This throws "TypeError: Assignment to constant variable."',
    difficulty: 'easy'
  },
  {
    id: 'bug-02',
    category: 'spot-the-bug',
    text: 'This loop crashes on its last lap. Why?',
    code: 'const nums = [1, 2, 3];\nfor (let i = 0; i <= nums.length; i++) {\n  console.log(nums[i].toFixed(1));\n}',
    language: 'javascript',
    options: [
      'toFixed does not exist on numbers',
      'Off-by-one: `<=` reads past the end, so nums[3] is undefined',
      '`let` cannot be used in loops',
      'nums should be declared with var'
    ],
    correct: 1,
    explanation: 'Valid indexes are 0 to length - 1. `nums[3]` is undefined, and `undefined.toFixed()` throws a TypeError. Use `<`.',
    difficulty: 'easy'
  },
  {
    id: 'bug-03',
    category: 'spot-the-bug',
    text: 'Which part of this markup is invalid?',
    code: '<ul>\n  <li>Candy</li>\n  <div>Pumpkin</div>\n  <li>Cobwebs</li>\n</ul>',
    language: 'html',
    options: [
      'The ul is missing a closing tag',
      'A div is not allowed as a direct child of ul',
      'Every li must contain a link',
      'No bug'
    ],
    correct: 1,
    explanation: 'The only permitted direct children of `<ul>` are `<li>` (plus script-supporting elements). Wrap the div inside an li instead.',
    difficulty: 'medium'
  },
  {
    id: 'bug-04',
    category: 'spot-the-bug',
    text: 'The ghost stays solid. What went wrong?',
    code: '.ghost {\n  color: white\n  opacity: 0.5;\n}',
    language: 'css',
    options: [
      'opacity cannot be 0.5',
      'The class selector needs a # prefix',
      'Missing semicolon: the browser drops both declarations',
      '"white" is not a valid colour'
    ],
    correct: 2,
    explanation: 'Without the semicolon the parser reads `white opacity: 0.5` as one invalid value and discards the whole declaration, so neither colour nor opacity is applied.',
    difficulty: 'medium'
  },
  {
    id: 'bug-05',
    category: 'spot-the-bug',
    text: 'Everyone can enter the secret lair! Why?',
    code: "if (user.role = 'admin') {\n  showSecretLair();\n}",
    language: 'javascript',
    options: [
      'The assignment `=` should be a comparison `===`',
      'if statements need an else branch',
      'showSecretLair must be async',
      "'admin' must use double quotes"
    ],
    correct: 0,
    explanation: '`user.role = \'admin\'` assigns the string (which is truthy) and overwrites the role. Use `===` to compare.',
    difficulty: 'easy'
  },
  {
    id: 'bug-06',
    category: 'spot-the-bug',
    text: 'The counter never goes up. What is the bug?',
    code: "<script setup>\nimport { ref } from 'vue'\nconst count = ref(0)\nfunction boo() {\n  count++\n}\n</script>",
    language: 'vue',
    options: [
      'ref must be imported from vue/ref',
      'script setup cannot declare functions',
      'No bug',
      'Forgot `.value`: it should be `count.value++`'
    ],
    correct: 3,
    explanation: 'Refs are objects; inside script you read and write them through `.value`. (Templates unwrap them automatically.)',
    difficulty: 'medium'
  },
  {
    id: 'bug-07',
    category: 'spot-the-bug',
    text: 'Why does `res.json` blow up?',
    code: "async function loadCandy() {\n  const res = fetch('/api/candy');\n  const data = await res.json();\n  return data;\n}",
    language: 'javascript',
    options: [
      'json() is not a Response method',
      'fetch is missing `await`, so res is a Promise',
      'async functions cannot call fetch',
      'It needs XMLHttpRequest instead'
    ],
    correct: 1,
    explanation: '`fetch()` returns a Promise. Without `await`, `res` is that Promise and has no `.json()` method yet.',
    difficulty: 'easy'
  },

  // ------------------------------------------------------ Guess the Cursed Output 👻
  {
    id: 'out-01',
    category: 'cursed-output',
    text: 'What does this print?',
    code: 'console.log(typeof null);',
    language: 'javascript',
    options: ['null', 'undefined', 'object', 'boolean'],
    correct: 2,
    explanation: 'A famous 1995 quirk: `typeof null` is "object". It has never been fixed because too much code relies on it.',
    difficulty: 'easy'
  },
  {
    id: 'out-02',
    category: 'cursed-output',
    text: 'Maths is haunted. What prints?',
    code: 'console.log(0.1 + 0.2 === 0.3);',
    language: 'javascript',
    options: ['true', 'false', 'NaN', 'undefined'],
    correct: 1,
    explanation: 'Floating-point numbers cannot represent 0.1 and 0.2 exactly. The sum is 0.30000000000000004.',
    difficulty: 'easy'
  },
  {
    id: 'out-03',
    category: 'cursed-output',
    text: 'What does this print?',
    code: 'console.log([] + {});',
    language: 'javascript',
    options: ['0', 'NaN', '[object Object]', 'undefined'],
    correct: 2,
    explanation: 'Both operands are converted to strings: `[]` becomes "" and `{}` becomes "[object Object]".',
    difficulty: 'medium'
  },
  {
    id: 'out-04',
    category: 'cursed-output',
    text: 'Subtraction vs. addition. What prints?',
    code: "console.log('5' - 2, '5' + 2);",
    language: 'javascript',
    options: ['3 7', '3 52', '52 3', 'NaN 52'],
    correct: 1,
    explanation: '`-` forces numeric conversion (5 - 2 = 3), while `+` with a string concatenates ("5" + "2" = "52").',
    difficulty: 'easy'
  },
  {
    id: 'out-05',
    category: 'cursed-output',
    text: 'What does this cursed one-liner print?',
    code: 'console.log([1, 2, 3].map(parseInt));',
    language: 'javascript',
    options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', '[1, 2, NaN]'],
    correct: 1,
    explanation: 'map passes (value, index), so it runs parseInt("2", 1) and parseInt("3", 2). Radix 1 is invalid and "3" is not a binary digit, so both are NaN.',
    difficulty: 'hard'
  },
  {
    id: 'out-06',
    category: 'cursed-output',
    text: 'What type is "Not a Number"?',
    code: 'console.log(typeof NaN);',
    language: 'javascript',
    options: ['NaN', 'undefined', 'number', 'object'],
    correct: 2,
    explanation: 'NaN is a special value of the number type. The irony is free of charge.',
    difficulty: 'easy'
  },
  {
    id: 'out-07',
    category: 'cursed-output',
    text: 'Three ghosts, three timeouts. What prints?',
    code: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}',
    language: 'javascript',
    options: ['0 1 2', '3 3 3', '2 2 2', 'undefined undefined undefined'],
    correct: 1,
    explanation: '`var` is function-scoped, so all callbacks share one `i`, which is 3 by the time they run. With `let` you would get 0 1 2.',
    difficulty: 'medium'
  },

  // ------------------------------------------------------------ Bug or Bluff? 🎭
  {
    id: 'bluff-01',
    category: 'bug-or-bluff',
    text: 'CSS can select an element based on whether it contains another element.',
    options: ['Bug — False', 'Bluff — True'],
    correct: 1,
    explanation: 'True! The `:has()` relational pseudo-class is the long-awaited "parent selector". Example: `card:has(img)`.',
    difficulty: 'easy'
  },
  {
    id: 'bluff-02',
    category: 'bug-or-bluff',
    text: 'In JavaScript, `NaN === NaN` evaluates to true.',
    options: ['Bug — False', 'Bluff — True'],
    correct: 0,
    explanation: 'False. NaN is the only value not equal to itself. Use `Number.isNaN(x)` to check for it.',
    difficulty: 'easy'
  },
  {
    id: 'bluff-03',
    category: 'bug-or-bluff',
    text: '`[10, 9, 1].sort()` returns `[1, 9, 10]`.',
    options: ['Bug — False', 'Bluff — True'],
    correct: 0,
    explanation: 'False. Without a comparator, sort() compares items as strings, giving `[1, 10, 9]`. Use `.sort((a, b) => a - b)`.',
    difficulty: 'medium'
  },
  {
    id: 'bluff-04',
    category: 'bug-or-bluff',
    text: 'HTML has a native `<dialog>` element that can open a modal with no library at all.',
    options: ['Bug — False', 'Bluff — True'],
    correct: 1,
    explanation: 'True! Call `dialog.showModal()` and you get a focus trap, backdrop, and Escape-to-close for free.',
    difficulty: 'easy'
  },
  {
    id: 'bluff-05',
    category: 'bug-or-bluff',
    text: 'The CSS `z-index` property works on every element, even ones with `position: static` (and no flex or grid parent).',
    options: ['Bug — False', 'Bluff — True'],
    correct: 0,
    explanation: 'False. z-index only applies to positioned elements and to flex/grid items. Plain static boxes ignore it.',
    difficulty: 'medium'
  },
  {
    id: 'bluff-06',
    category: 'bug-or-bluff',
    text: 'Declaring an object with `const` makes it completely immutable.',
    options: ['Bug — False', 'Bluff — True'],
    correct: 0,
    explanation: 'False. `const` stops reassignment of the variable, but you can still change properties. Use `Object.freeze()` for shallow immutability.',
    difficulty: 'easy'
  },
  {
    id: 'bluff-07',
    category: 'bug-or-bluff',
    text: "In JavaScript, `0 == '0'` is true and `0 == []` is true, but `'0' == []` is false.",
    options: ['Bug — False', 'Bluff — True'],
    correct: 1,
    explanation: 'True! Loose equality coerces: `[]` becomes "" then 0, so 0 == []. But "0" == "" compares two strings and is false. Just use `===`.',
    difficulty: 'hard'
  },

  // -------------------------------------------------------- Find the UI Monster 🧟
  {
    id: 'ui-01',
    category: 'ui-monster',
    text: 'A screen reader announces just "button". What is the monster?',
    code: '<button class="close">\n  <svg viewBox="0 0 24 24">…</svg>\n</button>',
    language: 'html',
    options: [
      'The icon-only button has no accessible name',
      'The SVG is too small',
      'A button should be a div',
      'It needs tabindex="5"'
    ],
    correct: 0,
    explanation: 'Icon-only buttons need a name: add `aria-label="Close"` (and `aria-hidden="true"` on the SVG) or visually hidden text.',
    difficulty: 'easy'
  },
  {
    id: 'ui-02',
    category: 'ui-monster',
    text: 'Which accessibility monster lurks in this field?',
    code: '<input type="email" placeholder="Your email">',
    language: 'html',
    options: [
      'type="email" is deprecated',
      'The input has no programmatic label; a placeholder is not a label',
      'Inputs must be wrapped in a div',
      'Placeholders can only hold numbers'
    ],
    correct: 1,
    explanation: 'Placeholders disappear while typing and are not reliably announced. Use a visible `<label for>` associated with the input.',
    difficulty: 'easy'
  },
  {
    id: 'ui-03',
    category: 'ui-monster',
    text: 'Keyboard users cannot cast the spell. Why?',
    code: '<div class="btn" onclick="castSpell()">\n  Cast spell\n</div>',
    language: 'html',
    options: [
      'onclick is deprecated',
      'The class name is too short',
      'It needs more padding',
      'A div is not focusable or keyboard-operable; use a <button>'
    ],
    correct: 3,
    explanation: 'Divs get no focus, no Enter/Space activation and no role. A native `<button>` provides all of it for free.',
    difficulty: 'easy'
  },
  {
    id: 'ui-04',
    category: 'ui-monster',
    text: 'What is wrong with this document outline?',
    code: '<h1>Haunted House</h1>\n<h4>Rooms</h4>\n<h4>Attic</h4>',
    language: 'html',
    options: [
      'Only one h1 is allowed per site',
      'h4 elements cannot be siblings',
      'Heading levels are skipped (h1 straight to h4)',
      'Headings must contain links'
    ],
    correct: 2,
    explanation: 'Screen-reader users navigate by heading level. Skipping levels breaks the outline; pick levels for structure, not for size (use CSS for looks).',
    difficulty: 'medium'
  },
  {
    id: 'ui-05',
    category: 'ui-monster',
    text: 'Hint text is "grey on white" (#9a9a9a on #ffffff). What is the monster?',
    code: '.hint {\n  color: #9a9a9a;\n  background: #ffffff;\n}',
    language: 'css',
    options: [
      'Hex colours must be uppercase',
      'Contrast is about 2.8:1, below the 4.5:1 WCAG AA minimum for normal text',
      'Grey is not allowed on white',
      'Text must always be black'
    ],
    correct: 1,
    explanation: 'WCAG AA requires at least 4.5:1 for normal text (3:1 for large text). #767676 is the lightest grey that passes on white.',
    difficulty: 'medium'
  },
  {
    id: 'ui-06',
    category: 'ui-monster',
    text: 'The only error indicator is a red border. What is the monster?',
    code: '.field.error {\n  border-color: red;\n}',
    language: 'css',
    options: [
      'red is not a web-safe colour',
      'Borders cannot change colour',
      'It relies on colour alone: add text, an icon and aria-invalid',
      'Errors must blink to be noticed'
    ],
    correct: 2,
    explanation: 'Colour must never be the only way to convey information (WCAG 1.4.1). Add an error message, an icon and `aria-invalid="true"`.',
    difficulty: 'medium'
  },
  {
    id: 'ui-07',
    category: 'ui-monster',
    text: 'Keyboard users can no longer see where they are. Who is the monster?',
    code: 'button:focus {\n  outline: none;\n}',
    language: 'css',
    options: [
      'Removing the focus outline without a replacement',
      'Using :focus instead of :hover',
      'Buttons cannot be styled',
      'outline needs a unit'
    ],
    correct: 0,
    explanation: 'A visible focus indicator is required (WCAG 2.4.7 / 2.4.11). Restyle it with `:focus-visible` instead of removing it.',
    difficulty: 'easy'
  }
]
