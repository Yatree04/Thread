import { classifyItem } from "./classify.js";
import { getThreads, createThread, addItemToThread, addTodo, newItemId } from "./store.js";
import { createEventForTodo } from "./calendar.js";

// The single funnel every new item (file, tab, download, screenshot) passes
// through: classify -> file into a Thread -> optionally spin off a to-do.
export async function handleNewItem(raw) {
  const threads = getThreads();
  const decision = await classifyItem(raw, threads);

  const item = {
    id: newItemId(),
    type: raw.type,
    name: raw.name,
    path: raw.path || null,
    url: raw.url || null,
    confidence: decision.confidence || "suggested",
    addedAt: Date.now(),
  };

  let thread = null;

  if (decision.action === "add_to_existing" && decision.thread_id) {
    thread = addItemToThread(decision.thread_id, item);
  } else if (decision.action === "new_thread" && decision.new_thread_name) {
    thread = createThread({
      name: decision.new_thread_name,
      item,
      whyGrouped: decision.why_grouped,
      summary: decision.summary,
    });
  }
  // action === "ignore" -> intentionally not filed anywhere.

  if (decision.is_todo && decision.todo_text) {
    const todo = addTodo({
      text: decision.todo_text,
      threadId: thread?.id || null,
      due: decision.due_iso ? { iso: decision.due_iso, text: decision.due_text || "" } : null,
    });
    if (todo.due?.iso) {
      createEventForTodo(todo).catch((err) => console.error("[pipeline] calendar sync failed:", err.message));
    }
  }

  console.log(
    `[pipeline] ${raw.type} "${raw.name}" -> ${decision.action}${thread ? ` (${thread.name})` : ""}${decision.is_todo ? " +todo" : ""}`
  );

  return { decision, thread, item };
}
