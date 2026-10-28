// ================================================================
//  配置（自托管版：前后端同域，API_BASE 为空即可）
// ================================================================
const API_BASE = '';
let squadData = [];
let sortMode = 'default';
let currentView = 'squad';
let isAdmin = false;
let adminToken = sessionStorage.getItem('adminToken') || null;

// ================================================================
//  导航切换
// ================================================================
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-menu a[data-view="${view}"]`);
    if (activeLink) activeLink.classList.add('active');
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    const container = document.getElementById(`view-${view}`);
    if (container) container.classList.add('active');
    if (view === 'standings') loadStandings();
    else renderView(view);
}

// ================================================================
//  管理员登录
// ================================================================
const adminPwdInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminStatus = document.getElementById('adminStatus');

async function verifyToken() {
    if (!adminToken) return false;
    try {
        const res = await fetch(`${API_BASE}/api/admin/verify`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.valid) { enableAdminMode(); return true; }
        sessionStorage.removeItem('adminToken'); adminToken = null; return false;
    } catch { return false; }
}

function enableAdminMode() {
    isAdmin = true;
    ['btnAddPlayer', 'btnAddAcademyPlayer', 'btnEditStandings'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    });
    if (adminStatus) { adminStatus.textContent = '✅ 管理员已登录'; adminStatus.style.color = '#ffd700'; }
    renderView(currentView === 'standings' ? 'squad' : currentView);
}

if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', async () => {
        const pwd = adminPwdInput ? adminPwdInput.value.trim() : '';
        if (!pwd) { if (adminStatus) adminStatus.textContent = '⚠️ 请输入密码'; return; }
        try {
            if (adminStatus) adminStatus.textContent = '⏳ 连接中...';
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (data.success) { adminToken = data.token; sessionStorage.setItem('adminToken', adminToken); enableAdminMode(); }
            else if (adminStatus) adminStatus.textContent = '❌ ' + (data.error || '密码错误');
        } catch (err) {
            console.error(err);
            if (adminStatus) adminStatus.textContent = '⚠️ 网络错误';
        }
    });
}
if (adminPwdInput) {
    adminPwdInput.addEventListener('keypress', e => { if (e.key === 'Enter' && adminLoginBtn) adminLoginBtn.click(); });
}

// ================================================================
//  数据加载
// ================================================================
async function loadData() {
    try {
        const res = await fetch(`${API_BASE}/api/players`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        squadData = await res.json();
        return true;
    } catch (err) {
        console.error('❌ 加载数据失败:', err);
        showToast('⚠️ 无法连接服务器');
        squadData = [];
        return false;
    }
}

// ================================================================
//  积分榜：加载与渲染
// ================================================================
async function loadStandings() {
    const body = document.getElementById('standingsBody');
    const empty = document.getElementById('standingsEmpty');
    try {
        const res = await fetch(`${API_BASE}/api/standings`);
        const rows = await res.json();
        if (rows.length === 0) {
            if (body) body.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (body) body.innerHTML = rows.map(r => `
            <tr>
                <td>${r.rank}</td>
                <td class="st-team">${escapeHtml(r.team)}</td>
                <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
                <td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td class="st-points">${r.points}</td>
            </tr>`).join('');
    } catch (e) {
        console.error(e);
        if (empty) { empty.style.display = 'block'; empty.textContent = '⚠️ 积分榜加载失败'; }
    }
}

// 积分榜编辑弹窗
const standingsModal = document.getElementById('standingsModal');
const standingsJson = document.getElementById('standingsJson');
const btnEditStandings = document.getElementById('btnEditStandings');
const closeStandingsModal = document.getElementById('closeStandingsModal');
const standingsSaveBtn = document.getElementById('standingsSaveBtn');

if (btnEditStandings) {
    btnEditStandings.addEventListener('click', async () => {
        if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/standings`);
            const rows = await res.json();
            standingsJson.value = JSON.stringify(rows, null, 2);
        } catch { standingsJson.value = '[]'; }
        if (standingsModal) standingsModal.classList.add('active');
    });
}
if (closeStandingsModal && standingsModal) {
    closeStandingsModal.addEventListener('click', () => standingsModal.classList.remove('active'));
    standingsModal.addEventListener('click', e => { if (e.target === standingsModal) standingsModal.classList.remove('active'); });
}
if (standingsSaveBtn) {
    standingsSaveBtn.addEventListener('click', async () => {
        if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
        let rows;
        try { rows = JSON.parse(standingsJson.value); }
        catch { showToast('⚠️ JSON 格式错误'); return; }
        if (!Array.isArray(rows)) { showToast('⚠️ 需为 JSON 数组'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/standings`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify(rows)
            });
            const data = await res.json();
            if (data.success) { showToast('✅ 积分榜已保存'); if (standingsModal) standingsModal.classList.remove('active'); loadStandings(); }
            else showToast('⚠️ 保存失败');
        } catch (e) { showToast('⚠️ 网络错误'); }
    });
}

// ================================================================
//  排序
// ================================================================
function sortSquad() {
    squadData.sort((a, b) => {
        const aNum = a.number != null && a.number !== '' ? Number(a.number) : Infinity;
        const bNum = b.number != null && b.number !== '' ? Number(b.number) : Infinity;
        if (aNum === Infinity && bNum === Infinity) return 0;
        if (aNum === Infinity) return 1;
        if (bNum === Infinity) return -1;
        return aNum - bNum;
    });
}

function renderView(view) {
    sortSquad();
    if (view === 'squad') renderSquad();
    else if (view === 'academy') renderAcademy();
}

function renderSquad() {
    const players = squadData.filter(p =>
        (p.team === undefined || p.team === null || p.team === '' || p.team === 'first') && !p.onLoan);
    renderPlayerList(players, 'squadContainer', '一线队');
    const loanPlayers = squadData.filter(p => p.onLoan);
    renderLoanList(loanPlayers);
}

function renderAcademy() {
    const u21 = squadData.filter(p => p.team === 'u21' && !p.onLoan);
    const u18 = squadData.filter(p => p.team === 'u18' && !p.onLoan);
    const container = document.getElementById('academyContainer');
    if (!container) return;
    let html = '';
    if (u21.length) html += `<div class="position-group"><div class="position-group-title">U21</div><div class="squad-grid">${u21.map(p => renderCard(p, true, 'U21')).join('')}</div></div>`;
    if (u18.length) html += `<div class="position-group"><div class="position-group-title">U18</div><div class="squad-grid">${u18.map(p => renderCard(p, true, 'U18')).join('')}</div></div>`;
    if (!u21.length && !u18.length) html = `<div class="empty-state">暂无梯队球员</div>`;
    container.innerHTML = html;
    bindEditButtons();
}

function renderPlayerList(players, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (players.length === 0) { container.innerHTML = `<div class="empty-state">暂无非租借球员</div>`; return; }
    let html = '';
    if (sortMode === 'position') {
        const positionOrder = ['门将', '后卫', '中场', '前锋'];
        for (const pos of positionOrder) {
            const group = players.filter(p => p.position === pos);
            if (group.length === 0) continue;
            html += `<div class="position-group"><div class="position-group-title">${pos}</div><div class="squad-grid">${group.map(p => renderCard(p, true, null)).join('')}</div></div>`;
        }
        const unassigned = players.filter(p => !p.position || p.position === '');
        if (unassigned.length > 0) html += `<div class="position-group"><div class="position-group-title">未指定</div><div class="squad-grid">${unassigned.map(p => renderCard(p, true, null)).join('')}</div></div>`;
    } else {
        html = `<div class="squad-grid">${players.map(p => renderCard(p, true, null)).join('')}</div>`;
    }
    container.innerHTML = html;
    bindEditButtons();
}

function renderCard(p, showPositionTag, teamLabel) {
    const originalIndex = squadData.indexOf(p);
    const codes = Array.isArray(p.nationality) ? p.nationality : [p.nationality || 'GB'];
    const flagHtml = codes.map(code => `<span class="flag-icon flag-icon-${getFlagClass(code)}"></span>`).join('');
    const avatarUrl = getAvatarUrl(p.avatar);
    const avatarHtml = avatarUrl
        ? `<img class="player-avatar" src="${avatarUrl}" alt="${p.enFirst} ${p.enLast}" loading="lazy" />`
        : `<span class="default-avatar">🦊</span>`;
    const displayName = p.displayName || p.lastName || '';
    const numberDisplay = (p.number != null && p.number !== '') ? p.number : '';
    const teamBadgeHtml = teamLabel ? `<div class="team-badge">${teamLabel}</div>` : '';
    const positionTagHtml = (showPositionTag && p.position) ? `<span class="position-tag ${p.position}">${p.position}</span>` : '';
    return `
        <div class="player-card" data-index="${originalIndex}">
            <button class="btn-edit-card" data-index="${originalIndex}" title="编辑球员" style="display:${isAdmin ? 'flex' : 'none'};">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <div class="avatar-frame">
                ${numberDisplay ? `<span class="shirt-number">${numberDisplay}</span>` : ''}
                ${teamBadgeHtml}
                ${avatarHtml}
                <div class="flag-corner">${flagHtml}</div>
            </div>
            <div class="card-body">
                <div class="name-row">
                    <span class="player-display-name">${displayName}</span>
                    ${positionTagHtml}
                </div>
                <div class="player-full-name">${p.enFirst || ''} ${p.enLast || ''}</div>
            </div>
        </div>`;
}

function renderLoanList(players) {
    const container = document.getElementById('loanList');
    if (!container) return;
    if (players.length === 0) { container.innerHTML = `<div class="loan-empty">暂无租借球员</div>`; return; }
    let html = '';
    for (const p of players) {
        const club = p.onLoan.to || '租借中';
        const until = p.onLoan.until || '';
        const numberDisplay = (p.number != null && p.number !== '') ? p.number : '';
        const displayName = p.displayName || p.lastName || '';
        const fullName = `${p.enFirst || ''} ${p.enLast || ''}`.trim();
        html += `
            <div class="loan-card">
                <div class="loan-card-top">
                    ${numberDisplay ? `<span class="loan-number">${numberDisplay}</span>` : ''}
                    <div class="loan-name-group">
                        <span class="loan-display-name">${displayName}</span>
                        <span class="loan-full-name">${fullName}</span>
                    </div>
                </div>
                <div class="loan-card-bottom">
                    <span class="loan-club"><i class="fas fa-arrow-right"></i> ${club}</span>
                    ${until ? `<span class="loan-until">📅 ${until}</span>` : ''}
                </div>
            </div>`;
    }
    container.innerHTML = html;
}

function getFlagClass(code) {
    const upper = (code || 'GB').toUpperCase();
    if (upper === 'GB') return 'gb-eng';
    if (upper.startsWith('GB-')) return 'gb-' + upper.substring(3).toLowerCase();
    return code.toLowerCase();
}

function getAvatarUrl(avatar) {
    if (!avatar) return null;
    if (avatar.startsWith('/uploads/')) return `${API_BASE}${avatar}`;
    return avatar;
}

function bindEditButtons() {
    document.querySelectorAll('.btn-edit-card').forEach(btn => btn.replaceWith(btn.cloneNode(true)));
    document.querySelectorAll('.btn-edit-card').forEach(btn => {
        btn.style.display = isAdmin ? 'flex' : 'none';
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
            const idx = parseInt(this.dataset.index);
            if (isNaN(idx)) { showToast('⚠️ 无法获取球员索引'); return; }
            openEditModal(idx);
        });
    });
}

// ================================================================
//  分类切换
// ================================================================
const toggleBtns = document.querySelectorAll('.btn-toggle');
if (toggleBtns.length) {
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            toggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            sortMode = this.dataset.mode;
            renderView(currentView === 'standings' ? 'squad' : currentView);
        });
    });
}

// ================================================================
//  球员编辑模态框
// ================================================================
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModal');
const playerForm = document.getElementById('playerForm');
const editIndex = document.getElementById('editIndex');
const modalTitle = document.getElementById('modalTitle');
const formSubmit = document.getElementById('formSubmit');
const btnDelete = document.getElementById('btnDelete');
const loanSelect = document.getElementById('formLoan');
const loanClubGroup = document.getElementById('loanClubGroup');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const avatarPreview = document.getElementById('avatarPreview');
const previewImg = document.getElementById('previewImg');
const clearAvatarBtn = document.getElementById('clearAvatarBtn');
const formAvatar = document.getElementById('formAvatar');
const dropIcon = document.getElementById('dropIcon');
const dropText = document.getElementById('dropText');
let currentAvatarData = '';

if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) handleFile(files[0]);
        else showToast('⚠️ 请拖拽图片文件');
    });
}
if (fileInput) fileInput.addEventListener('change', e => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = e => { currentAvatarData = e.target.result; formAvatar.value = e.target.result; showPreview(e.target.result); showToast('✅ 头像已预览'); };
    reader.onerror = () => showToast('⚠️ 图片读取失败');
    reader.readAsDataURL(file);
}
function showPreview(dataUrl) {
    if (previewImg) previewImg.src = dataUrl;
    if (avatarPreview) avatarPreview.style.display = 'block';
    if (dropIcon) dropIcon.style.display = 'none';
    if (dropText) dropText.style.display = 'none';
    const hint = dropZone ? dropZone.querySelector('.drop-hint') : null; if (hint) hint.style.display = 'none';
}
function hidePreview() {
    if (avatarPreview) avatarPreview.style.display = 'none';
    if (dropIcon) dropIcon.style.display = 'block';
    if (dropText) dropText.style.display = 'block';
    const hint = dropZone ? dropZone.querySelector('.drop-hint') : null; if (hint) hint.style.display = 'block';
    if (previewImg) previewImg.src = '';
    currentAvatarData = ''; if (formAvatar) formAvatar.value = '';
}
if (clearAvatarBtn) clearAvatarBtn.addEventListener('click', e => { e.preventDefault(); hidePreview(); if (fileInput) fileInput.value = ''; showToast('🗑️ 头像已移除'); });
function resetDropZone() { hidePreview(); if (fileInput) fileInput.value = ''; if (dropZone) dropZone.classList.remove('dragover'); }

function openEditModal(index) {
    if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
    if (!modalOverlay || !editIndex || !modalTitle || !formSubmit || !btnDelete) { showToast('⚠️ 模态框未加载'); return; }
    const isNew = index === -1;
    editIndex.value = index; resetDropZone();
    const ids = ['formNumber','formDisplayName','formEnFirst','formEnLast','formFirstName','formLastName','formPosition','formTeam','formNationality','formLoanClub','formLoanUntil'];
    const g = id => document.getElementById(id);
    if (isNew) {
        modalTitle.innerHTML = '<i class="fas fa-plus" style="color:#FDBE11;"></i> 添加球员';
        formSubmit.textContent = '添加'; btnDelete.style.display = 'none';
        ids.forEach(id => { if (g(id)) g(id).value = ''; });
        formAvatar.value = ''; currentAvatarData = '';
        loanSelect.value = ''; loanClubGroup.style.display = 'none';
    } else {
        const p = squadData[index];
        if (!p) { showToast('⚠️ 未找到球员数据'); return; }
        modalTitle.innerHTML = '<i class="fas fa-pen" style="color:#FDBE11;"></i> 编辑球员';
        formSubmit.textContent = '保存'; btnDelete.style.display = 'block';
        g('formNumber').value = p.number != null ? p.number : '';
        g('formDisplayName').value = p.displayName || p.lastName || '';
        g('formEnFirst').value = p.enFirst || ''; g('formEnLast').value = p.enLast || '';
        g('formFirstName').value = p.firstName || ''; g('formLastName').value = p.lastName || '';
        g('formPosition').value = p.position || ''; g('formTeam').value = p.team || '';
        g('formNationality').value = Array.isArray(p.nationality) ? p.nationality.join(',') : (p.nationality || '');
        if (p.avatar) { currentAvatarData = p.avatar; formAvatar.value = p.avatar; showPreview(p.avatar); } else resetDropZone();
        if (p.onLoan) { loanSelect.value = '租借中'; g('formLoanClub').value = p.onLoan.to || ''; g('formLoanUntil').value = p.onLoan.until || ''; loanClubGroup.style.display = 'block'; }
        else { loanSelect.value = ''; g('formLoanClub').value = ''; g('formLoanUntil').value = ''; loanClubGroup.style.display = 'none'; }
    }
    modalOverlay.classList.add('active');
}
function closeModal() { if (modalOverlay) modalOverlay.classList.remove('active'); resetDropZone(); }
if (loanSelect) loanSelect.addEventListener('change', function () { loanClubGroup.style.display = this.value === '租借中' ? 'block' : 'none'; });

if (playerForm) {
    playerForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
        const idx = parseInt(editIndex.value);
        const id = (idx !== -1 && squadData[idx] && squadData[idx].id) ? squadData[idx].id : null;
        const formData = new FormData();
        if (id) formData.append('id', id);
        const g = id => document.getElementById(id).value || '';
        ['number','displayName','enFirst','enLast','firstName','lastName','position','team'].forEach(k => formData.append(k, g('form' + k[0].toUpperCase() + k.slice(1))));
        const natStr = document.getElementById('formNationality').value.trim();
        const nationality = natStr ? natStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : ['GB'];
        formData.append('nationality', JSON.stringify(nationality));
        const loanStatus = loanSelect.value;
        let onLoan = null;
        if (loanStatus === '租借中') onLoan = { to: document.getElementById('formLoanClub').value.trim() || '租借中', until: document.getElementById('formLoanUntil').value.trim() };
        formData.append('onLoan', JSON.stringify(onLoan));
        if (fileInput && fileInput.files.length > 0) formData.append('avatar', fileInput.files[0]);
        else if (formAvatar.value) formData.append('avatar', formAvatar.value);
        try {
            const res = await fetch(`${API_BASE}/api/players`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: formData
            });
            const result = await res.json();
            if (result.success) { showToast('✅ 球员已保存'); await loadData(); renderView(currentView === 'standings' ? 'squad' : currentView); closeModal(); }
            else showToast('⚠️ 保存失败: ' + (result.error || '未知错误'));
        } catch (err) { console.error(err); showToast('⚠️ 网络错误'); }
    });
}

if (btnDelete) {
    btnDelete.addEventListener('click', async () => {
        if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; }
        const idx = parseInt(editIndex.value);
        if (idx === -1) return;
        if (!confirm('确定要删除该球员吗？')) return;
        const p = squadData[idx];
        if (!p || !p.id) { showToast('⚠️ 无法获取球员 ID'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/players/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } });
            if (res.ok) { showToast('🗑️ 球员已删除'); await loadData(); renderView(currentView === 'standings' ? 'squad' : currentView); closeModal(); }
            else showToast('⚠️ 删除失败');
        } catch (err) { console.error(err); showToast('⚠️ 网络错误'); }
    });
}
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

const btnAdd = document.getElementById('btnAddPlayer');
if (btnAdd) btnAdd.addEventListener('click', () => { if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; } document.getElementById('formTeam').value = 'first'; openEditModal(-1); });
const btnAcademy = document.getElementById('btnAddAcademyPlayer');
if (btnAcademy) btnAcademy.addEventListener('click', () => { if (!isAdmin) { showToast('⚠️ 请先登录管理员'); return; } document.getElementById('formTeam').value = ''; openEditModal(-1); });

function showToast(msg) {
    const el = document.getElementById('toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show'); clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// ================================================================
//  初始化
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await verifyToken();
    await loadData();
    switchView('squad');
});
