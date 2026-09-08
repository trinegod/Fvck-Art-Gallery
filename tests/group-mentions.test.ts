import assert from "node:assert/strict";
import test from "node:test";
import { applyGroupMention, findGroupMentionQuery, groupMentionSuggestions, resolveGroupMentionTokens } from "../lib/group-mentions";

const members = [
  { id: "a", username: "ada", display_name: "Ada Example", avatar_url: null },
  { id: "b", username: "bob-art", display_name: "Bob Art", avatar_url: null },
];

test("mentions match complete current-member tokens, not emails, paths, longer names or markup", () => {
  const body = "Hi @ADA, (@bob-art). no ada@ada.test /@ada @@ada word@ada @ada_more @ada-long <script> @gone sales+@ada.example \"sales\"@ada.example é@ada.example";
  const mentions = resolveGroupMentionTokens(body, members, false);
  assert.deepEqual(mentions.map(mention => mention.username), ["ada", "bob-art"]);
  assert.deepEqual(mentions.map(mention => body.slice(mention.start, mention.end)), ["@ADA", "@bob-art"]);
  assert.equal(resolveGroupMentionTokens("@everyone", members, false).length, 0);
  assert.deepEqual(resolveGroupMentionTokens("@everyone @EvErYoNe", members, true).map(mention => mention.username), ["everyone", "everyone"]);
});

test("autocomplete inserts a current member at the caret while preserving the rest of the draft", () => {
  const text = "Hi @bo, keep this";
  const query = findGroupMentionQuery(text, 6);
  assert.ok(query);
  const suggestions = groupMentionSuggestions(query.query, members, false);
  assert.deepEqual(suggestions.map(suggestion => suggestion.username), ["bob-art"]);
  assert.deepEqual(applyGroupMention(text, query, suggestions[0].username), { value: "Hi @bob-art, keep this", caret: 11 });
  for (const input of ["email@ad", "/@ad", "@@ad", "word@ad", "@ada_more", "sales+@ad", '"sales"@ad', "é@ad"]) assert.equal(findGroupMentionQuery(input, input.length), null, input);
});

test("everyone suggestions are privileged and the list is bounded to real current members", () => {
  assert.equal(groupMentionSuggestions("", members, false).some(suggestion => suggestion.username === "everyone"), false);
  assert.equal(groupMentionSuggestions("eve", members, true)[0]?.username, "everyone");
  assert.equal(groupMentionSuggestions("missing", members, true).length, 0);
  const many = Array.from({ length: 30 }, (_, index) => ({ id: String(index), username: `member-${index}`, display_name: "Member", avatar_url: null }));
  assert.equal(groupMentionSuggestions("", many, true).length, 6);
  const removed = members.filter(member => member.username !== "ada");
  assert.equal(resolveGroupMentionTokens("@ada", removed, false).length, 0);
  const ambiguous = [...members, { id: "duplicate", username: "ADA", display_name: "Different Ada", avatar_url: null }];
  assert.equal(groupMentionSuggestions("ada", ambiguous, false).length, 0);
  assert.equal(resolveGroupMentionTokens("@ada", ambiguous, false).length, 0);
});

test("insertion cannot exceed the unchanged 2000-character message limit", () => {
  const text = `${"x".repeat(1996)} @b`;
  const query = findGroupMentionQuery(text, text.length);
  assert.ok(query);
  assert.equal(applyGroupMention(text, query, "bob-art"), null);
});
