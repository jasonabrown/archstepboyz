/* GLOBAL VARS */

const currentDate = new Date();

const DB_URL = "https://qeuvposbesblckyuflbd.supabase.co";
const TEAMS_ENDPOINT =
  "https://qeuvposbesblckyuflbd.supabase.co/rest/v1/Teams?order=conf.asc,conf_pos.asc";
const COMMENTS_ENDPOINT =
  "https://qeuvposbesblckyuflbd.supabase.co/rest/v1/Comments";
const USERS_ENDPOINT = "https://qeuvposbesblckyuflbd.supabase.co/rest/v1/Users";

const ANON_API_KEY = "sb_publishable_mZVo1bfw-ChB9iCx1V5QwA_UUKrCx8o";

const db_client = supabase.createClient(DB_URL, ANON_API_KEY);

let CACHED_COMMENTS_DB = [];
let AUTHED_USER = null;
let currentCellId = null;
let queryString;

var GAMES = [];
const PICKERS = [
  { id: 'FE', color: '#6c5ce7' }, // Purple
  { id: 'GA', color: '#00cec9' }, // Teal
  { id: 'NO', color: '#fab1a0' }, // Peach
  { id: 'BI', color: '#fdcb6e' }, // Yellow
  { id: 'CO', color: '#d63031' },  // Red
  { id: 'CB', color: '#0984e3' },  // Blue
  { id: 'JO', color: '#00b894' },  // Green
  /* unused */
  { id: '-', color: '#e17055' },  // Orange
  { id: '--', color: '#e84393' },  // Pink
];
let showingAllPicks = false;
const CURRENT_WEEK = 10;

/* HELPER METHODS */

async function getCityFromIP() {
  try {
    const response = await fetch("https://ipapi.co/json");
    const data = await response.json();
    const city = data.city;
    const region = data.region;
    return `${city}/${region}`;
  } catch (e) {
    return "New York/New York";
  }
}

/* DB API Requests */
async function apiReq(url, method, data) {
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: ANON_API_KEY,
        apikey: ANON_API_KEY,
      },
      body: data == null ? null : JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (method === "GET") {
      const responseData = await response.json();
      return responseData;
    } else {
      return;
    }
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

async function fetchTeams() {
  return apiReq(TEAMS_ENDPOINT, "GET");
}

async function isUserSignedIn() {
  const data = await db_client.auth.getSession();
  if (data?.session) {
    AUTHED_USER = data.session.user?.user_metadata;
    authedUserDisplay();
  }
  // TODO: move
  if (AUTHED_USER?.username === "fearthebeak") {
    document.getElementById("fabButton").style.display = "flex";
    document.querySelectorAll(".Row__Toggle").forEach((element) => {
      element.style.display = "block";
    });
  }
}

/* PAGE INITIALIZATION */

document.addEventListener("DOMContentLoaded", (event) => {
  const inputField = document.getElementById("commentInput");
  const sendButton = document.getElementById("sendBtn");

  inputField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendButton.click();
    }
  });

  const gridBtn = document.getElementById("gridViewBtn");
  const listBtn = document.getElementById("listViewBtn");
  const picksBtn = document.getElementById("picksViewBtn");
  const mainContent = document.getElementById("MainContent");

  function switchToGrid() {
    gridBtn.classList.add("active");
    listBtn.classList.remove("active");
    picksBtn.classList.remove("active");

    const list = document.querySelector(".list-container");
    list.style.display = "none";
    const fab = document.querySelector(".Fab-Wrapper");
    fab.style.display = "none";
    const save = document.querySelector(".Fab-Save");
    save.style.display = "none";
    const table = document.querySelector(".table-container");
    table.style.display = "flex";
    const picks = document.querySelector(".Picks-Container");
    picks.style.display = "none";
    const picksToggle = document.querySelector(".Toggle-Container");
    picksToggle.style.display = "none";
  }

  function switchToList() {
    listBtn.classList.add("active");
    gridBtn.classList.remove("active");
    picksBtn.classList.remove("active");

    const table = document.querySelector(".table-container");
    table.style.display = "none";
    const list = document.querySelector(".list-container");
    list.style.display = "flex";
    const fab = document.querySelector(".Fab-Wrapper");
    fab.style.display = "flex";
    const save = document.querySelector(".Fab-Save");
    save.style.display = "none";
    const picks = document.querySelector(".Picks-Container");
    picks.style.display = "none";
    const picksToggle = document.querySelector(".Toggle-Container");
    picksToggle.style.display = "none";
  }

  function switchToPicks() {
    listBtn.classList.remove("active");
    gridBtn.classList.remove("active");
    picksBtn.classList.add("active");

    const table = document.querySelector(".table-container");
    table.style.display = "none";
    const list = document.querySelector(".list-container");
    list.style.display = "none";
    const fab = document.querySelector(".Fab-Wrapper");
    fab.style.display = "none";
    const save = document.querySelector(".Fab-Save");
    //save.style.display = "flex";
    const picks = document.querySelector(".Picks-Container");
    picks.style.display = "flex";
    const picksToggle = document.querySelector(".Toggle-Container");
    picksToggle.style.display = "flex";
  }

  gridBtn.addEventListener("click", switchToGrid);
  listBtn.addEventListener("click", switchToList);
  picksBtn.addEventListener("click", switchToPicks);

  queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const view = urlParams.get("view");
  const chat = urlParams.get("chat");

  switch (view) {
    case "grid":
      switchToGrid();
      break;
    case "PBL":
      switchToList();
      break;
    case "picks":
      switchToPicks();
      break;
    default:
      switchToGrid();
  }

  /* POPULATE TABLE */
  fetchTeams().then((res) => {
    fetchComments().then((comments) => {
      CACHED_COMMENTS_DB = comments.data;
      appendTeamCells(res);

      const header = document.querySelector(".Table__THEAD");
      setTimeout(() => {
        header.classList.add("header-enter");
      }, 100);

      const rows = document.querySelectorAll(".Table__TBODY .Table__TR");
      rows.forEach((row, index) => {
        setTimeout(
          () => {
            row.classList.add("row-enter");
          },
          300 + index * 100,
        ); // Start rows 300ms in, then cascade
      });

      const cells = document.querySelectorAll(".Table__TD");
      cells.forEach((cell) => {
        const team = cell.getAttribute("data-cell-name");
        if (
          CACHED_COMMENTS_DB?.filter((comment) => comment.team === team)
            .length > 0
        ) {
          cell.classList.add("has-comments");
        }
        cell.addEventListener("click", () => openDrawer(cell));
        if (chat && team === chat) {
          cell.click();
        }
      });
    });
  });

  db_client.auth.onAuthStateChange((event, session) => {
    AUTHED_USER = session?.user?.user_metadata;
    if (AUTHED_USER) {
      authedUserDisplay();
    }
  });

  isUserSignedIn();
});

/* TABLE GRID FORMAT HELPER */
const appendTeamCells = (data) => {
  const placeholderHtmlString = `
    <!-- X  -->
    <td class="Table__TD">
    </td>
    `;

  data.forEach((team, idx) => {
    const item = document.querySelector(`tr[data-idx="${team.conf_pos}"]`);

    const htmlString = `
      <td class="Table__TD" ext-id="${team.id}" data-cell-id="${team.conf}-${team.conf_pos - 1}" data-cell-name="${team.name}">
        <div class="team-link flex items-centerclr-gray-03 mascot-row mascot-row">
          <span class="pr4 TeamLink__Logo">
            <!-- <a class="AnchorLink" tabindex="0" href="https://www.espn.com/mens-college-basketball/team/stats/_/id/${team.id}" target="_blank" rel="noopener noreferrer"> -->
            <img 
              alt="${team.name}" 
              class="Image Logo Logo__sm" 
              title="${team.name}" 
              data-mptype="image" 
              src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${team.id}.png&h=200&w=200"
            >
            <!-- </a> --->
          </span>
          <div class="meta-stack">
            ${
              team.change > 0
                ? '<div class="trend-tag trend-up"><i>&#9650;</i>' +
                  team.change.toString() +
                  "</div>"
                : team.change < 0
                  ? '<div class="trend-tag trend-down"><i>&#9660;</i>' +
                    (-1 * team.change).toString() +
                    "</div>"
                  : '<div class="trend-tag trend-neutral"><span class="dash-bar"></span></div>'
            }
            ${team.rank != null ? '<div class="ovr-tag">#' + team.rank.toString() + "</div>" : ""}
          </div>
        </div>
      </td>
      `;

    while (
      item.childElementCount - 1 < team.conf &&
      team.conf != 999 &&
      item.childElementCount < 15
    ) {
      item.insertAdjacentHTML("beforeend", placeholderHtmlString);
    }
    item.insertAdjacentHTML("beforeend", htmlString);
  });
};

/* COMMENTS */

/* DB LOOKUPS (ASYNC) */
async function fetchComments() {
  return db_client.from("Comments").select("*");
}

async function postComment(data) {
  return db_client.from("Comments").insert([data]);
}

async function deleteComment(commentId) {
  return db_client.from("Comments").delete().eq("id", commentId);
}

/* UI METHODS */
function updateCellIndicator() {
  const cell = document.querySelector(
    `.Table__TD[data-cell-id="${currentCellId}"]`,
  );
  if (cell) cell.classList.add("has-comments");
}

function closeDrawer() {
  const drawer = document.getElementById("commentDrawer");
  drawer.classList.remove("open");
  currentCellId = null;
}

async function openDrawer(cell) {
  if (event.target.closest("a")) return;

  closeDrawer();
  currentCellId = cell.getAttribute("data-cell-name");

  await renderComments();

  document.querySelector(".Drawer__Title").innerHTML = `
    <a 
      class="AnchorLink" 
      style="text-decoration: none; color: white;" 
      tabindex="0" 
      href="https://www.espn.com/mens-college-basketball/team/stats/_/id/${cell.getAttribute("ext-id")}" 
      target="_blank" 
      rel="noopener noreferrer"
  >
    <img 
      alt="${cell.getAttribute("data-cell-name")}" 
      class="Image Logo Logo__sm" 
      title="${cell.getAttribute("data-cell-name")}" 
      data-mptype="image" 
      src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${cell.getAttribute("ext-id")}.png&h=200&w=200"
    >
  </a>
  `;

  const drawer = document.getElementById("commentDrawer");
  drawer.style.display = "flex";
  setTimeout(() => {
    drawer.classList.add("open");
  }, 300); // TODO: shouldn't need this hardcoded timeout; add an await above for rednder comments
}

async function renderComments() {
  const container = document.getElementById("drawerContent");

  const comments = await fetchComments();
  CACHED_COMMENTS_DB = comments.data;

  const main_comments =
    CACHED_COMMENTS_DB?.filter(
      (comment) =>
        comment.team === currentCellId && comment.reply_to_id == null,
    ) ?? [];

  if (main_comments.length === 0) {
    container.innerHTML = `
        <div style="text-align:center; color: rgba(255,255,255,0.3); margin-top: 50px;">
        <i class="fa-regular fa-comments" style="font-size: 30px; margin-bottom:10px;"></i><br>
        No comments yet.<br>Start the discussion!
        </div>`;
    return;
  }

  let html = "";
  main_comments.forEach((comment) => {
    const replies = CACHED_COMMENTS_DB?.filter(
      (c) => c.reply_to_id == comment.id,
    );

    const isAdmin = comment.author === "Admin";
    const adminBadgeHTML = isAdmin
      ? `<span class="Admin-Badge"><i class="fa-solid fa-thumbtack"></i> Pinned</span>`
      : "";

    const deleteVisibilityClass =
      AUTHED_USER != null && AUTHED_USER.username === "fearthebeak"
        ? "is-visible"
        : "";

    html += `
        <div class="Comment-Item">
          <div class="Comment-Box ${isAdmin ? "is-admin" : ""}">
            <div class="Comment-Header">
              <span class="Comment-User">
                ${comment.author}
                ${adminBadgeHTML} 
                <span style="font-weight:400; color:#aaa; margin-left:5px;">
                  (${new Date(comment.created_at).toLocaleString(navigator.language, { dateStyle: "medium", timeStyle: "short" })})
                </span>
              </span>

              <button class="delete-btn ${deleteVisibilityClass}" aria-label="Delete" onclick="deleteCommentModal(${comment.id})">&times;</button>
            </div>

            <p class="Comment-Text">${formatMentions(comment.message)}</p>
      
            <button class="Reply-Btn" onclick="toggleReply(${comment.id})">Reply</button>
    
            <div id="reply-input-${comment.id}" class="Input-Group" style="display:none; margin-top:10px;">
              <input type="text" id="reply-text-${comment.id}" class="Input-Field" placeholder="Reply..." style="font-size: 16px; padding: 5px;">
              <button id="reply-submit-${comment.id}" class="Send-Btn" onclick="submitReply(${comment.id})" style="padding: 2px 10px; font-size: 16px;">Send</button>
            </div>
          </div>

          <div class="Reply-List">
            ${replies
              ?.map(
                (reply) => `
              <div class="Comment-Box" style="margin-top: 10px; background: rgba(255,255,255,0.03);">
                <div class="Comment-Header">
                  <span class="Comment-User" style="color: #2ed573">
                    ${reply.author}
                    <span style="font-weight:400; color:#aaa; margin-left:5px;">
                      (${new Date(reply.created_at).toLocaleString(navigator.language, { dateStyle: "medium", timeStyle: "short" })})
                    </span>
                  </span>
                  <button class="delete-btn ${deleteVisibilityClass}" style="background-color: #05714b;" aria-label="Delete" onclick="deleteCommentModal(${reply.id})">&times;</button>
                </div>
                <p class="Comment-Text">${reply.message}</p>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        `;
  });

  container.innerHTML = html;

  main_comments.forEach((comment) => {
    const inputField = document.getElementById(`reply-input-${comment.id}`);
    const sendButton = document.getElementById(`reply-submit-${comment.id}`);

    inputField.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendButton.click();
      }
    });
  });
}

function toggleReply(commentId) {
  const el = document.getElementById(`reply-input-${commentId}`);
  if (el.style.display === "flex") {
    el.style.display = "none";
  } else {
    el.style.display = "flex";
  }
}

async function deleteCommentModal(commentId) {
  const children = CACHED_COMMENTS_DB.filter(
    (c) => c.reply_to_id === commentId,
  );

  if (children.length > 0) {
    await Promise.all(children.map((c) => deleteComment(c.id)));
  }
  await deleteComment(commentId);
  await renderComments();
  updateCellIndicator();
}

async function submitComment() {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text) return;

  const mentions = getValidMentions(text).map((mention) => mention.email);

  const city = await getCityFromIP();
  await postComment({
    author: AUTHED_USER != null ? AUTHED_USER.username : city,
    message: text,
    team: currentCellId,
    mentions: mentions,
  });

  input.value = "";
  await renderComments();
  updateCellIndicator();
}

async function submitReply(parentId) {
  const input = document.getElementById(`reply-text-${parentId}`);
  const text = input.value.trim();
  if (!text) return;

  const parentComment = CACHED_COMMENTS_DB.find(
    (c) => c.team === currentCellId && c.id === parentId,
  );

  if (parentComment) {
    const city = await getCityFromIP();
    await postComment({
      author: AUTHED_USER != null ? AUTHED_USER.username : city,
      message: text,
      team: currentCellId,
      reply_to_id: parentId,
    });
  }
  await renderComments();
}

// TODO: initialization
let MOCK_USERS = [];
const MOCK_USERS2 = db_client
  .from("Profiles")
  .select("username, email, id")
  .then((res) => {
    MOCK_USERS = res.data;
    renderAll();
  });

const inputField = document.getElementById("commentInput");
const mentionList = document.getElementById("mentionList");

inputField.addEventListener("input", (e) => {
  const value = e.target.value;
  const cursor = e.target.selectionStart;

  // Find the word being typed at the cursor
  const textBeforeCursor = value.slice(0, cursor);
  //TODO: spaces...
  const words = textBeforeCursor.split(/\s+/);
  const currentWord = words[words.length - 1];

  // Check if current word starts with @
  if (currentWord.startsWith("@")) {
    const query = currentWord.slice(1).toLowerCase();
    showSuggestions(query, cursor);
  } else {
    hideSuggestions();
  }
});

/* --- PARSER FUNCTION --- */
function getValidMentions(inputText) {
  if (!inputText) return [];

  // 1. Sort users by name length (Longest -> Shortest)
  // This prevents "Hoops" from matching inside "@Hoops Fan"
  const sortedUsers = [...MOCK_USERS].sort(
    (a, b) => b.username.length - a.username.length,
  );

  // 2. Escape special regex characters in names (like ., ?, etc.)
  // This keeps the regex safe if a user is named "Mr. Smith"
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 3. Create the Pipe-Separated Pattern
  // Result looks like: (Hoops Fan|Net Ripper|Dr\. Dunk|Admin|Hoops)
  const namesPattern = sortedUsers
    .map((u) => escapeRegex(u.username))
    .join("|");

  // 4. Build the Full Regex
  // @       -> Look for the @ symbol
  // (...)   -> Match one of our names
  // (?!\w)  -> Negative Lookahead: Ensure the NEXT char is NOT a word character
  //            (Prevents matching "@Admin" inside "@Administrator")
  const regex = new RegExp(`@(${namesPattern})(?!\\w)`, "gi");

  // 5. Execute Match
  const matches = [...inputText.matchAll(regex)];

  // 6. Map matches back to full User Objects
  const foundUsers = matches.map((match) => {
    // match[1] contains the captured name (e.g., "Hoops Fan")
    // We use find() to get the original object with case-insensitivity
    return MOCK_USERS.find(
      (u) => u.username.toLowerCase() === match[1].toLowerCase(),
    );
  });

  // 7. Deduplicate (Remove duplicates if user mentioned same person twice)
  const uniqueUsers = [
    ...new Map(foundUsers.map((u) => [u.username, u])).values(),
  ];

  return uniqueUsers;
}

function showSuggestions(query, cursorPos) {
  // Filter Users
  const matches = MOCK_USERS.filter((u) =>
    u.username.toLowerCase().includes(query),
  );

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  // Build HTML
  mentionList.innerHTML = matches
    .map(
      (u) => `
    <div class="Mention-Item" onclick="insertMention('${u.username}')">
      <div class="Mention-Avatar">${u.username[0]}</div>
      ${u.username}
    </div>
  `,
    )
    .join("");

  mentionList.classList.add("active");
}

function hideSuggestions() {
  mentionList.classList.remove("active");
}

function insertMention(name) {
  const value = inputField.value;
  const cursor = inputField.selectionStart;
  const textBefore = value.slice(0, cursor);
  const textAfter = value.slice(cursor);

  // Replace the partial @word with the full @Name
  const words = textBefore.split(/\s+/);
  words.pop(); // Remove the partial word

  const newValue =
    words.join(" ") +
    (words.length > 0 ? " " : "") +
    "@" +
    name +
    " " +
    textAfter;

  inputField.value = newValue;
  inputField.focus();
  hideSuggestions();
}

function formatMentions(text) {
  if (!text) return "";

  // 1. Sort users by length (Longest -> Shortest)
  // CRITICAL: We must match "Hoops Fan" before we match "Hoops",
  // otherwise the regex will stop early and leave " Fan" as plain text.
  const sortedUsers = [...MOCK_USERS].sort(
    (a, b) => b.username.length - a.username.length,
  );

  // 2. Escape special characters for Regex safety
  const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 3. Build the Pattern
  // Creates a string like: (Hoops Fan|Net Ripper|Admin|...)
  const namesPattern = sortedUsers
    .map((u) => escapeRegex(u.username))
    .join("|");

  // 4. Create Regex
  // @       -> Literal @ symbol
  // (...)   -> Capture group for the name
  // (?!\w)  -> Negative Lookahead: Ensure the next char is NOT a letter/number
  const regex = new RegExp(`@(${namesPattern})(?!\\w)`, "gi");

  // 5. Perform Replacement
  return text.replace(regex, (fullMatch, capturedName) => {
    // 'capturedName' is what the user typed (e.g. "admin" or "Hoops fan")

    // Optional Polish: Look up the "Official" casing from the list
    // (So if they typed "@admin", we render "Admin")
    const officialUser = MOCK_USERS.find(
      (u) => u.username.toLowerCase() === capturedName.toLowerCase(),
    );
    const displayName = officialUser ? officialUser.username : capturedName;

    return `<span class="Mention-Badge">@${displayName}</span>`;
  });
}

/* LIST VIEW */

const teamsData = [
  { id: "pbl-row1", name: "Mark Anti-Pope", record: "9-4", streak: "W4" },
  { id: "pbl-row2", name: "Will Fade", record: "9-4", streak: "W2" },
  { id: "pbl-row3", name: "Minnesota T-Wolves", record: "56-26", streak: "W2" },
];

const modal = document.getElementById("addTeamModal");

// Open Modal (handles both Add and Edit states)
function openAddModal(teamIdToEdit = null) {
  const listContainer = document.getElementById("rankingList");
  //const modal = document.getElementById('teamModal');
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalSubmitBtn = document.getElementById("modalSubmitBtn");
  //const editRowIdInput = document.getElementById('editRowId');
  const inputName = document.getElementById("inputName");
  const inputRecord = document.getElementById("inputRecord");
  const inputStreak = document.getElementById("inputStreak");
  // Reset form first
  //document.querySelector('form').reset();
  //editRowIdInput.value = '';

  if (teamIdToEdit) {
    const team = teamsData.find((t) => t.id === teamIdToEdit);
    modalTitle.textContent = "Edit Team";
    modalDesc.textContent = "Update team statistics.";
    modalSubmitBtn.textContent = "Save Changes";
    //editRowIdInput.value = team.id;
    inputName.value = team.name;
    inputRecord.value = team.record;
    inputStreak.value = team.streak;
    toggleDrawer(teamIdToEdit); // Close drawer on click
  } else {
    // --- ADD MODE ---
    modalTitle.textContent = "New Fraud";
    modalDesc.textContent = "Add a team to the parlay banned list.";
    modalSubmitBtn.textContent = "Add to List";
  }

  modal.classList.add("open");
  setTimeout(() => inputName.focus(), 100);
}

function closeAddModal(e) {
  // If e is passed (click event), only close if clicking overlay background
  if (e && e.target !== modal) return;
  modal.classList.remove("open");

  // Clear inputs after transition
  setTimeout(() => {
    document.getElementById("inputName").value = "";
    document.getElementById("inputRecord").value = "";
    document.getElementById("inputStreak").value = "";
  }, 300);
}

function toggleDrawer(id) {
  const row = document.getElementById(id);
  // Close others first (optional, but cleaner UX)
  document.querySelectorAll(".Ranking-Row-Wrapper").forEach((r) => {
    if (r.id !== id) r.classList.remove("drawer-open");
  });
  row.classList.toggle("drawer-open");
}

// TODO: implement
function deleteTeam(id) {
  if (confirm("Coming soon!")) {
    // Remove from data array
    //teamsData = teamsData.filter(t => t.id !== id);
    // Re-render list to update ranks
    //renderList();
    return;
  }
  return;
}

function handleNewTeam(event) {
  event.preventDefault();
  alert("Coming soon!");
  return;

  /*
            const name = document.getElementById('inputName').value;
            const record = document.getElementById('inputRecord').value;
            const streak = document.getElementById('inputStreak').value.toUpperCase();

            // Determine Streak Color
            let streakClass = "";
            if (streak.startsWith('W')) streakClass = "is-win";
            if (streak.startsWith('L')) streakClass = "is-loss";

            const list = document.getElementById('rankingList');
            const rank = list.children.length + 1;

            // HTML for new row
            const newRow = document.createElement('div');
            newRow.className = 'Ranking-Row';
            newRow.innerHTML = `
                <div class="Row__Rank">${rank}</div>
                <div class="Row__Team">
                    <div class="Team__Name">${name}</div>
                </div>
                <div class="Row__Stats">
                    <div class="Stat-Group">
                        <span class="Stat__Value">${record}</span>
                        <span class="Stat__Label">Rec</span>
                    </div>
                    <div class="Stat-Group">
                        <span class="Stat__Value ${streakClass}">${streak}</span>
                        <span class="Stat__Label">Strk</span>
                    </div>
                </div>
            `;

            list.appendChild(newRow);
            
            // Scroll to new item
            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Close modal
            closeAddModal();
            */
}

/* LOGIN */

function openLoginModal() {
  scrollPosition = window.scrollY;

  const overlay = document.getElementById("loginOverlay");
  overlay.classList.add("open");

  document.body.classList.add("drawer-open");
  document.body.style.top = `-${scrollPosition}px`;
}

function closeLoginModal(event) {
  if (event && !event.target.classList.contains("Modal-Overlay")) {
    return;
  }

  const overlay = document.getElementById("loginOverlay");
  overlay.classList.remove("open");

  document.body.classList.remove("drawer-open");
  document.body.style.top = "";
  window.scrollTo(0, scrollPosition);
}

function authedUserDisplay() {
  /*
    const loginBtn = document.querySelector('.Login-Trigger');
    
    loginBtn.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#2ed573"></i> ${AUTHED_USER.username}`;
    
    loginBtn.style.cursor = 'default';
    loginBtn.style.borderColor = '#2ed573'; 
    loginBtn.style.background = 'rgba(46, 213, 115, 0.1)'; 
    
    loginBtn.onclick = null;
    */

  document.getElementById("loginBtn").style.display = "none";
  document.getElementById("userMenu").style.display = "block";
  document.getElementById("userDisplay").innerText = AUTHED_USER.username;
  document.querySelector('.Unauthed-Picks').style.display = "flex";

  // TODO: only if admin
  if (AUTHED_USER.username === "fearthebeak") {
    const deleteCommentBtns = document.querySelectorAll(".delete-btn");
    deleteCommentBtns.forEach((btn) => {
      btn.style.display = "flex";
    });
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const userIn = usernameInput.value;
  const passIn = passwordInput.value;

  /*
  const { data, error } = await db_client
    .rpc('check_password', { 
      input_username: userIn, 
      input_password: passIn, 
    });
  */
  const { data, error } = await db_client.auth.signInWithPassword({
    email: userIn,
    password: passIn,
  });

  if (error) {
    alert("Invalid Credentials. Please try again.");
    console.error("Error:", error);
    passwordInput.value = "";
    return;
  }

  AUTHED_USER = data?.user?.user_metadata;

  authedUserDisplay();

  closeLoginModal();

  usernameInput.value = "";
  passwordInput.value = "";
}

function toggleAuthMode(mode) {
  const slider = document.getElementById("authSlider");
  const box = document.querySelector(".Auth-Box");

  if (mode === "signup") {
    slider.classList.remove("show-login");
    slider.classList.add("show-signup");
    // Optional: Adjust height if signup form is taller
    // box.style.height = '450px';
    box.style.height = "600px";
  } else {
    slider.classList.remove("show-signup");
    slider.classList.add("show-login");
    // box.style.height = '380px';
    box.style.height = "420px";
  }
}

function toggleUserDropdown(event) {
  // Prevent the click from immediately bubbling up and closing the menu
  if (event) event.stopPropagation();

  const menu = document.getElementById("userDropdown");
  const isActive = menu.classList.contains("active");

  if (isActive) {
    closeDropdown();
  } else {
    menu.classList.add("active");
    // Add the "click out" listener only when the menu is open
    document.addEventListener("click", closeDropdownOnClickOutside);
  }
}

function closeDropdown() {
  const menu = document.getElementById("userDropdown");
  if (menu) {
    menu.classList.remove("active");
    // Clean up the listener so it doesn't fire unnecessarily
    document.removeEventListener("click", closeDropdownOnClickOutside);
  }
}

function closeDropdownOnClickOutside(event) {
  const menu = document.getElementById("userDropdown");
  const trigger = document.querySelector(".User-Trigger");

  // If the click is NOT inside the menu AND NOT on the trigger button
  if (menu && !menu.contains(event.target) && !trigger.contains(event.target)) {
    closeDropdown();
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearSignupError();

  const newUsername = document.getElementById("new-username").value;
  const newEmail = document.getElementById("new-email").value;
  const newPassword = document.getElementById("new-password").value;
  const referralCode = document.getElementById("new-referral").value;

  if (password.length < 8) {
    showSignupError("Password must be at least 8 characters.");
    document.getElementById("new-password").classList.add("input-invalid");
    return;
  }

  if (referralCode.length < 6) {
    showSignupError("Referral code must be at least 6 characters.");
    document.getElementById("new-referral").classList.add("input-invalid");
    return;
  }

  const accountCreated = await signUpWithReferral(
    newEmail,
    newPassword,
    newUsername,
    referralCode,
  );

  if (accountCreated) {
    // 1. Get the form container and success container
    const formContent = document.getElementById("signup-content");
    const successContent = document.getElementById("signup-success");

    // 2. Validate (The 'required' attribute handles empty fields,
    // but you can add specific logic here if needed)
    const referral = document.getElementById("new-referral").value;

    // Example: Check specific code (Optional)
    // if (referral !== 'ARCHSTEP') { alert('Invalid Code'); return; }

    // 3. Simulate API Call / Processing
    const btn = event.target.querySelector("button");
    const originalText = btn.innerText;
    btn.innerText = "Creating...";

    setTimeout(() => {
      // 4. Hide Form, Show Success
      formContent.style.display = "none";
      successContent.style.display = "flex";
      const box = document.querySelector(".Auth-Box");
      box.style.height = "420px";

      // Reset button text for next time
      btn.innerText = originalText;

      // Clear inputs (Security/Polish)
      document.getElementById("new-username").value = "";
      document.getElementById("new-email").value = "";
      document.getElementById("new-password").value = "";
      document.getElementById("new-referral").value = "";
      document.getElementById("new-referral").classList.remove("input-invalid");
    }, 1000); // Fake delay for realism
  }
}

async function signUpWithReferral(email, password, username, referralCode) {
  const { data: validCode, codeError } = await db_client.rpc(
    "check_referral_code",
    { input_code: referralCode },
  );

  if (!validCode) {
    showSignupError(
      "Invalid referral code. Please contact a founding ArchStepBoyz member.",
    );
    document.getElementById("new-referral").classList.add("input-invalid");
    return false;
  }

  const { data, error } = await db_client.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        username: username,
        referral_code: referralCode,
      },
      emailRedirectTo: "https://archstepboyz.github.io/archstepboyz",
    },
  });

  if (error) {
    return false;
  } else {
    return true;
  }
}

function resetSignupView() {
  closeLoginModal();

  setTimeout(() => {
    document.getElementById("signup-content").style.display = "block";
    document.getElementById("signup-success").style.display = "none";
    toggleAuthMode("login");
  }, 300);
}

function showSignupError(message) {
  const errorBox = document.getElementById("signup-error-msg");
  errorBox.innerText = message;
  errorBox.style.display = "block";

  // Re-trigger animation if it's already visible
  errorBox.style.animation = "none";
  errorBox.offsetHeight; /* trigger reflow */
  errorBox.style.animation = null;
}

function clearSignupError() {
  const errorBox = document.getElementById("signup-error-msg");
  errorBox.style.display = "none";
  errorBox.innerText = "";
}

function validateInputs() {
  const codeEl = document.getElementById("new-referral");
  const code = codeEl.value.trim();
  if (code.length > 0 && code.length < 6) {
    codeEl.classList.add("input-invalid");
    showSignupError("Referral code must be at least 6 characters.");
    return false;
  }
  const errorBox = document.getElementById("signup-error-msg");
  if (errorBox.innerText.includes("Password")) {
    clearSignupError();
  }

  const passEl = document.getElementById("new-password");
  const pass = passEl.value.trim();
  if (pass.length > 0 && pass.length < 8) {
    passEl.classList.add("input-invalid");
    showSignupError("Password must be at least 8 characters.");
    return false;
  }
  passEl.classList.remove("input-invalid");

  if (errorBox.innerText.includes("Password")) {
    clearSignupError();
  }

  return true;
}

async function handleLogout() {
  const { error } = await db_client.auth.signOut();

  if (error) {
    console.error("Error signing out:", error.message);
  } else {
    document.getElementById("userMenu").style.display = "none";
    document.getElementById("loginBtn").style.display = "flex";
    document.getElementById("userDropdown").classList.remove("active");
    AUTHED_USER = null; // TODO: don't rely on this global
  }
}

async function forgotPassword() {
  return;

  /*
  const { error } = await db_client.auth.resetPasswordForEmail("", {
    redirectTo: 'https://archstepboyz.github.io/archstepboyz', 
  });

  if (error) {
    console.error('Error sending password reset email:', error.message);
    alert('Failed to send reset email. Please check your email address.');
  } else {
    alert('Password reset email sent. Check your inbox!');
  }
  */
}
forgotPassword();

/* PICKS */

/* DB CALLS */
async function addValueToArray(columnName, valueToAdd, rowId) {
  const { data, error } = await db_client.rpc('add_pick_value', {
    row_id: rowId,
    target_column: columnName,
    val_to_add: valueToAdd
  });

  if (error) {
    console.error('Error adding value:', error.message);
  } else {
    console.log('Value added successfully');
  }
}

async function removeValueFromArray(columnName, valueToRemove, rowId) {
  const { data, error } = await db_client.rpc('remove_pick_value', {
    row_id: rowId,
    target_column: columnName,
    val_to_remove: valueToRemove
  });

  if (error) {
    console.error('Error removing value:', error.message);
  } else {
    console.log('Value removed successfully');
  }
}

async function fetchPicks(week) {
  return db_client.from("Picks").select("*").eq('week',week).order('time').order('id');
}

// TODO: make this more scalable for many users
function getPickerObj(id) {
  return PICKERS.find(p => p.id === id) ?? { id: '?', color: '#ff7675' };
}

function toggleView() {
  showingAllPicks = document.getElementById('viewToggle').checked;
  renderAll();
}

function switchPick(gameId, targetSide) {
    const gamePicks = GAMES.find( game => game.id ===  gameId );
    const userId = AUTHED_USER?.username?.slice(0,2).toUpperCase();
    const currentSide = gamePicks.away_picks?.includes(userId) ? 'away_picks' : (gamePicks.home_picks?.includes(userId) ? 'home_picks' : null);

    // Remove from current side
    if (currentSide) {
      gamePicks[currentSide] = gamePicks[currentSide]?.filter(id => id !== userId);
      removeValueFromArray(currentSide, AUTHED_USER?.sub, gameId);
    }
    
    // If user clicked the side they are already on, do nothing
    if (currentSide !== targetSide) {
      if (gamePicks[targetSide] == null) {
        gamePicks[targetSide] = [];
      }
      gamePicks[targetSide].push(userId);
      addValueToArray(targetSide, AUTHED_USER?.sub, gameId);
    }

    // Re-render only this card
    renderCardToDOM(gameId);
}

        function createAvatarHTML(pickerIds) {
            if (pickerIds == null) return '';
            
            const userId = AUTHED_USER?.username?.slice(0,2).toUpperCase();
            let visibleIds = pickerIds;
            if (!showingAllPicks) visibleIds = pickerIds.filter(id => id === userId);
            
            return visibleIds.map(id => {
                const p = getPickerObj(id);
                
                const extraClass = (id === userId) ? 'just-added' : '';
                const userClass = (id === userId) ? 'current-user' : '';
                
                return `<div class="Avatar ${userClass} ${extraClass}" style="background-color: ${p.color};">${p.id}</div>`;
            }).join('');
        }

        function renderCardHTML(game, week) {
            // Check Consensus (5 pickers total)
            const isAwayConsensus = game.away_picks?.length === 5;
            const isHomeConsensus = game.home_picks?.length === 5;

            let awayClasses = [];
            let homeClasses = [];

            if (!showingAllPicks) {
                awayClasses.push(game.winner === 'away' ? 'is-winner' : ''); 
                homeClasses.push(game.winner === 'home' ? ' is-winner' : '');
            } else {
              if (isAwayConsensus) awayClasses.push('is-consensus');
              if (isHomeConsensus) homeClasses.push('is-consensus');

              if (game.winner) {
                awayClasses.push(game.winner === 'away' ? ' is-winner' : ' is-loser');
                homeClasses.push(game.winner === 'home' ? ' is-winner' : ' is-loser');
              }
            }
            const awayClass = awayClasses.join(' ');
            const homeClass = homeClasses.join(' ');

            const gameDate = new Date(game.time)
            const gameTime = gameDate.toLocaleString(navigator.language, {
              // year: "numeric", 
              // month: "short", 
              // day: "numeric", 
              hour: "numeric", 
              minute: "2-digit", 
              timeZoneName: "short" 
            });

            const awayClickFn = gameDate > currentDate ? `onclick="switchPick(${game.id}, 'away_picks')"` : '';
            const homeClickFn = gameDate > currentDate ? `onclick="switchPick(${game.id}, 'home_picks')"` : '';

            const awayLog = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${game.away_id}.png&h=200&w=200`;
            const homeLog = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${game.home_id}.png&h=200&w=200`;

            return `
            <div class="Game-Slip" id="game-${game.id}">
                <div class="Slip__Meta">
                    <span><i class="fa-solid fa-basketball"></i> ${game.league}</span>
                    <span>${gameTime}</span>
                </div>

                <div class="Team-Section ${awayClass}" ${awayClickFn}>
                    <div class="Team__Header">
                        <img src="${awayLog}" class="Team__Logo" alt="${game.away}">
                        <div class="Team__Text">
                            <span class="Team__Name">${game.away}</span>
                            <span class="Team__Record">${game.away_record}</span>
                        </div>
                    </div>
                    <div class="Picker-Row">
                        ${createAvatarHTML(game.away_picks?.sort())}
                    </div>
                    <div class="Consensus-Badge"> <i class="fa-solid fa-check"></i></div>
                </div>

                <div class="Slip__Divider"><span>VS</span></div>

                <div class="Team-Section ${homeClass}" ${homeClickFn}>
                    <div class="Team__Header">
                        <img src="${homeLog}" class="Team__Logo" alt="${game.home}">
                         <div class="Team__Text">
                            <span class="Team__Name">${game.home}</span>
                            <span class="Team__Record">${game.home_record}</span>
                        </div>
                    </div>
                    <div class="Picker-Row">
                        ${createAvatarHTML(game.home_picks?.sort())}
                    </div>
                    <div class="Consensus-Badge"> <i class="fa-solid fa-check"></i></div>
                </div>
            </div>
            `;
        }

        function renderCardToDOM(gameId) {
            const game = GAMES.find(g => g.id === gameId);
            const week = document.querySelector('.Week-Select-Input')?.value.split(' ').at(-1) ?? '9';
            const cardHTML = renderCardHTML(game, week);
            
            const existingEl = document.getElementById(`game-${gameId}`);
            if (existingEl) {
                existingEl.outerHTML = cardHTML;
            }
        }

        async function renderAll(forceRefresh = false) {
            const list = document.getElementById('picks-new');
            const finalList = document.getElementById('picks-final');
            console.log(finalList);
            list.innerHTML = '';
            finalList.innerHTML = '';
            const week = document.querySelector('.Week-Select-Input')?.value.split(' ').at(-1) ?? '9';
            
            if (GAMES.length === 0 || forceRefresh) {
              const g = await fetchPicks(week);
              GAMES = g.data;
              GAMES.forEach((game, index) => {
                game['home_picks'] = game['home_picks']?.map(uuid => MOCK_USERS.find(user => user.id === uuid)?.username?.slice(0,2).toUpperCase() ?? '?');
                game['away_picks'] = game['away_picks']?.map(uuid => MOCK_USERS.find(user => user.id === uuid)?.username?.slice(0,2).toUpperCase() ?? '?');
              });
            }

            // TODO: remove; only showing games I picked for fun
            //GAMES = GAMES.filter(game => game.away_picks?.includes('FE') || game.home_picks?.includes('FE'));

            let lastDate = '';
            let days = 0;
            let indexBrk = 0;
            GAMES.forEach((game, index) => {
              const d = new Date(game.time);
              const date = d.toLocaleString(navigator.language, { month: "short", day: "numeric", weekday: "long" });
              const notCompleted = currentDate < d || date === currentDate.toLocaleString(navigator.language, { month: "short", day: "numeric", weekday: "long" });

              if (date !== lastDate) {
                indexBrk = index;
                days += 1;
                const separatorHTML = `
                <div class="Date-Separator">
                    <div class="Date-Separator__Text">
                        <i class="fa-regular fa-calendar"></i> ${date}
                    </div>
                </div>
                `;
                lastDate = date;
                if (notCompleted) {
                  list.insertAdjacentHTML('beforeend', separatorHTML);
                  list.insertAdjacentHTML('beforeend', `<div class="Matchup-Column" id="${days}-col-1"></div>`);
                  list.insertAdjacentHTML('beforeend', `<div class="Matchup-Column" id="${days}-col-2"></div>`);
                } else {
                  finalList.insertAdjacentHTML('afterbegin', `<div class="Matchup-Column" id="${days}-col-2"></div>`);
                  finalList.insertAdjacentHTML('afterbegin', `<div class="Matchup-Column" id="${days}-col-1"></div>`);
                  finalList.insertAdjacentHTML('afterbegin', separatorHTML);
                }
              }
                const colA = document.getElementById(`${days}-col-1`);
                const colB = document.getElementById(`${days}-col-2`);

                const cardHTML = renderCardHTML(game, week);
                if ((index - indexBrk) % 2 === 0) {
                    colA.insertAdjacentHTML(notCompleted ? 'beforeend' : 'afterbegin', cardHTML);
                } else {
                    colB.insertAdjacentHTML(notCompleted ? 'beforeend' : 'afterbegin', cardHTML);
                }
            });
        }


// AUTH LOGIC
const isUserLoggedIn = false;
        if (!isUserLoggedIn) {
            document.getElementById('gatekeeper').classList.add('active');
            const cont = document.querySelector('.Picks-Container');
            cont.classList.add('is-locked');
        }
        function simulateLogin() {
            const btn = document.querySelector('.GK__Button');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';
            setTimeout(() => {
                document.getElementById('lockIcon').classList.replace('locked','unlocked');
                document.getElementById('iconSymbol').classList.replace('fa-lock','fa-lock-open');
                btn.style.background = '#00b894'; btn.innerText = "Welcome!";
                setTimeout(() => {
                    document.getElementById('gatekeeper').style.transform = 'translateY(-100%)';
                    document.body.classList.remove('is-locked');
                }, 800);
            }, 1000);
        }
