// js/notes-list.js

// ================================================
// CHECK IF USER IS LOGGED IN (FOR AUTH LINK)
// ================================================
(async function checkAuthStatus() {
    const user = await getCurrentUser();
    const authLink = document.getElementById('authLink');

    if (user) {
        // User is logged in - show Logout link
        authLink.textContent = 'Logout';
        authLink.href = '#';
        authLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await logout();
            window.location.reload();
        });
    } else {
        // User is not logged in - show Login link
        authLink.textContent = 'Login';
        authLink.href = 'login.html';
    }
})();

// ================================================
// FETCH AND DISPLAY ALL NOTES
// ================================================
async function loadNotes() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const notesGrid = document.getElementById('notesGrid');
    const emptyState = document.getElementById('emptyState');
    const notesCount = document.getElementById('notesCount');

    try {
        // Fetch all notes from database, ordered by newest first
        // Also fetch the uploader's profile info using JOIN
        const { data: notes, error } = await supabaseClient
            .from('notes')
            .select(`
        *,
        profiles (
          full_name,
          branch
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Hide loading indicator
        loadingIndicator.style.display = 'none';

        // Check if there are any notes
        if (!notes || notes.length === 0) {
            emptyState.style.display = 'block';
            notesCount.textContent = 'No notes available';
            return;
        }

        // Update count
        notesCount.textContent = notes.length + ' note(s) available';

        // Display each note as a card
        notes.forEach(function(note) {
            const card = createNoteCard(note);
            notesGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading notes:', error);
        loadingIndicator.innerHTML = '<p style="color: red;">❌ Error loading notes: ' + error.message + '</p>';
    }
}

// ================================================
// CREATE A NOTE CARD (HTML ELEMENT)
// ================================================
function createNoteCard(note) {
    // Create card container
    const card = document.createElement('div');
    card.className = 'note-card';

    // Format date to readable format
    const date = new Date(note.created_at);
    const formattedDate = date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Get uploader name (if available)
    const uploaderName = note.profiles ? note.profiles.full_name : 'Unknown';
    const uploaderBranch = note.profiles ? note.profiles.branch : '';

    // Get public URL for the PDF file
    const { data: urlData } = supabaseClient.storage
        .from('notes-files')
        .getPublicUrl(note.file_path);

    const fileUrl = urlData.publicUrl;

    // Build card HTML with beautiful design
    card.innerHTML = `
    <div class="card-header">
      <h3>${escapeHtml(note.title)}</h3>
      <span class="semester-badge">Sem ${note.semester}</span>
    </div>
    
    <div class="card-body">
      <p class="card-info">
        <strong>📚 Subject:</strong> ${escapeHtml(note.subject)}
      </p>
      <p class="card-info">
        <strong>📑 Unit:</strong> ${escapeHtml(note.unit)}
      </p>
      <p class="card-description">
        ${escapeHtml(note.description || 'No description provided')}
      </p>
    </div>
    
    <div class="card-footer">
      <div class="card-meta">
        <span class="uploader">👤 ${escapeHtml(uploaderName)}${uploaderBranch ? ' (' + escapeHtml(uploaderBranch) + ')' : ''}</span>
        <span class="date">📅 ${formattedDate}</span>
      </div>
      <a href="${fileUrl}" target="_blank" class="btn-download">
        📥 View / Download PDF
      </a>
    </div>
  `;

    return card;
}

// ================================================
// HELPER: ESCAPE HTML TO PREVENT XSS ATTACKS
// ================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================================================
// LOAD NOTES WHEN PAGE LOADS
// ================================================
window.addEventListener('DOMContentLoaded', loadNotes);