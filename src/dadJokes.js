/**
 * Dad Joke Break — question/answer riddle jokes.
 * Each entry: { setup, punchline }.
 */
export const DAD_JOKES = [
  { setup: "What do you call a fish with no eyes?", punchline: "A fsh." },
  { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field." },
  { setup: "What do you call a factory that makes okay products?", punchline: "A satisfactory." },
  { setup: "Why do bees have sticky hair?", punchline: "Because they use a honeycomb." },
  { setup: "Did you hear about the kidnapping at school?", punchline: "It's fine, he woke up." },
  { setup: "How can you tell it's a dogwood tree?", punchline: "By the bark." },
  { setup: "Why did the man fall down the well?", punchline: "Because he couldn't see that well." },
  { setup: "Where do you learn to make ice cream?", punchline: "At sundae school." },
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything." },
  { setup: "Why couldn't the bike stand up by itself?", punchline: "Because it was too tired." },
  { setup: "Why shouldn't you write with a broken pencil?", punchline: "Because it's pointless." },
  { setup: "How does Darth Vader like his toast?", punchline: "On the dark side." },
  { setup: "Why did the tomato blush?", punchline: "Because it saw the salad dressing." },
  { setup: "What do you call a cow with no legs?", punchline: "Ground beef." },
  { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese." },
  { setup: "Why was 6 afraid of 7?", punchline: "Because 7-8-9." },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
  { setup: "Why can't you give Elsa a balloon?", punchline: "She'll let it go." },
  { setup: "Why did the math book look so sad?", punchline: "Because it had too many problems." },
  { setup: "Why can't a nose be 12 inches long?", punchline: "Because then it would be a foot." },
  { setup: "Where do sheep go on vacation?", punchline: "The Baaa-hamas." },
  { setup: "Why are ghosts bad liars?", punchline: "You can see right through them." },
  { setup: "What did one wall say to the other?", punchline: "I'll meet you at the corner." },
  { setup: "Why did the kids cross the playground?", punchline: "To get to the other slide." },
  { setup: "What's the difference between a dad joke and a bad joke?", punchline: "The first letter." },
  { setup: "Why did the cookie go to the hospital?", punchline: "It felt crummy." },
  { setup: "Why are circles bad at telling stories?", punchline: "They're pointless." },
  { setup: "Why couldn't the toilet paper cross the road?", punchline: "He got stuck in a crack." },
  { setup: "How do you know if an ant is male or female?", punchline: "They're all females or else they'd be uncles." },
  { setup: "What do you call a nose without a body?", punchline: "No body nose." },
  { setup: "What do you call a cold puppy?", punchline: "A chili dog." },
  { setup: "When's the best time to call your dentist?", punchline: "Tooth-hurty." },
  { setup: "What's the best way to catch a fish?", punchline: "Ask someone to throw it to you." },
  { setup: "How do you make an eggroll?", punchline: "You push it." },
  { setup: "What do you call a can opener that doesn't work?", punchline: "A can't opener." },
  { setup: "What's brown and sticky?", punchline: "A stick." },
];

/** Pick `count` distinct random jokes from the pool. */
export function getRandomJokes(count) {
  const shuffled = [...DAD_JOKES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
