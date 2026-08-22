// ================================================================
//  配置
// ================================================================
const API_BASE = 'http://localhost:3000/api';
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
    if (view !== 'standings') {
        renderView(view);
    }
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
        const res = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.valid) {
            enableAdminMode();
            return true;
        } else {
            sessionStorage.removeItem('adminToken');
            adminToken = null;
            return false;
        }
    } catch (e) {
        return false;
    }
}

function enableAdminMode() {
    isAdmin = true;
    const btnAdd = document.getElementById('btnAddPlayer');
    if (btnAdd) btnAdd.style.display = 'flex';
    const btnAcademy = document.getElementById('btnAddAcademyPlayer');
    if (btnAcademy) btnAcademy.style.display = 'flex';
    if (adminStatus) {
        adminStatus.textContent = '✅ 管理员已登录';
        adminStatus.style.color = '#ffd700';
    }
    // 强制刷新当前视图以重新绑定编辑按钮事件
    renderView(currentView);
}

if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', async () => {
        const pwd = adminPwdInput ? adminPwdInput.value.trim() : '';
        if (!pwd) {
            if (adminStatus) adminStatus.textContent = '⚠️ 请输入密码';
            return;
        }
        try {
            if (adminStatus) adminStatus.textContent = '⏳ 连接中...';
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (data.success) {
                adminToken = data.token;
                sessionStorage.setItem('adminToken', adminToken);
                enableAdminMode(); // 这里会调用 renderView
            } else {
                if (adminStatus) adminStatus.textContent = '❌ ' + (data.error || '密码错误');
            }
        } catch (err) {
            console.error(err);
            if (adminStatus) adminStatus.textContent = '⚠️ 网络错误 - 请确保后端已启动';
        }
    });
}

if (adminPwdInput) {
    adminPwdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && adminLoginBtn) adminLoginBtn.click();
    });
}

// ================================================================
//  数据加载
// ================================================================
async function loadData() {
    try {
        console.log('🔄 正在加载数据...');
        const res = await fetch(`${API_BASE}/players`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ 数据加载成功，共', data.length, '名球员');
        squadData = data;
        return true;
    } catch (err) {
        console.error('❌ 加载数据失败:', err);
        showToast('⚠️ 无法连接服务器，请确保后端已启动 (node server.js)');
        squadData = [];
        return false;
    }
}

// ================================================================
//  排序
// ================================================================
function sortSquad() {
    squadData.sort((a, b) => {
        const aNum = a.number !== undefined && a.number !== null && a.number !== '' ? Number(a.number) : Infinity;
        const bNum = b.number !== undefined && b.number !== null && b.number !== '' ? Number(b.number) : Infinity;
        if (aNum === Infinity && bNum === Infinity) return 0;
        if (aNum === Infinity) return 1;
        if (bNum === Infinity) return -1;
        return aNum - bNum;
    });
}

// ================================================================
//  渲染视图
// ================================================================
function renderView(view) {
    sortSquad();
    if (view === 'squad') renderSquad();
    else if (view === 'academy') renderAcademy();
    // standings 由 widget 自渲染
}

// ================================================================
//  一线队：排除租借球员
// ================================================================
function renderSquad() {
    const players = squadData.filter(p => 
        (p.team === undefined || p.team === null || p.team === '' || p.team === 'first') &&
        !p.onLoan
    );
    renderPlayerList(players, 'squadContainer', '一线队');
    const loanPlayers = squadData.filter(p => p.onLoan);
    renderLoanList(loanPlayers);
}

// ================================================================
//  梯队：排除租借球员
// ================================================================
function renderAcademy() {
    const u21 = squadData.filter(p => p.team === 'u21' && !p.onLoan);
    const u18 = squadData.filter(p => p.team === 'u18' && !p.onLoan);
    const container = document.getElementById('academyContainer');
    if (!container) return;
    let html = '';
    if (u21.length) {
        html += `<div class="position-group"><div class="position-group-title">U21</div><div class="squad-grid">${u21.map(p => renderCard(p, true, 'U21')).join('')}</div></div>`;
    }
    if (u18.length) {
        html += `<div class="position-group"><div class="position-group-title">U18</div><div class="squad-grid">${u18.map(p => renderCard(p, true, 'U18')).join('')}</div></div>`;
    }
    if (!u21.length && !u18.length) {
        html = `<div class="empty-state">暂无梯队球员</div>`;
    }
    container.innerHTML = html;
    bindEditButtons();
}

// ================================================================
//  通用列表渲染
// ================================================================
function renderPlayerList(players, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (players.length === 0) {
        container.innerHTML = `<div class="empty-state">暂无非租借球员</div>`;
        return;
    }
    let html = '';
    if (sortMode === 'position') {
        const positionOrder = ['门将', '后卫', '中场', '前锋'];
        for (const pos of positionOrder) {
            const group = players.filter(p => p.position === pos);
            if (group.length === 0) continue;
            html += `
                <div class="position-group">
                    <div class="position-group-title">${pos}</div>
                    <div class="squad-grid">
                        ${group.map(p => renderCard(p, true, null)).join('')}
                    </div>
                </div>
            `;
        }
        const unassigned = players.filter(p => !p.position || p.position === '');
        if (unassigned.length > 0) {
            html += `
                <div class="position-group">
                    <div class="position-group-title">未指定</div>
                    <div class="squad-grid">
                        ${unassigned.map(p => renderCard(p, true, null)).join('')}
                    </div>
                </div>
            `;
        }
    } else {
        html = `<div class="squad-grid">${players.map(p => renderCard(p, true, null)).join('')}</div>`;
    }
    container.innerHTML = html;
    bindEditButtons();
}

// ================================================================
//  卡片渲染
// ================================================================
function renderCard(p, showPositionTag, teamLabel) {
    const originalIndex = squadData.indexOf(p);

    let flagHtml = '';
    const codes = Array.isArray(p.nationality) ? p.nationality : [p.nationality || 'GB'];
    const flagItems = codes.map(code => {
        const cls = getFlagClass(code);
        return `<span class="flag-icon flag-icon-${cls}"></span>`;
    });
    flagHtml = flagItems.join('');

    const avatarUrl = getAvatarUrl(p.avatar);
    const avatarHtml = avatarUrl ?
        `<img class="player-avatar" src="${avatarUrl}" alt="${p.enFirst} ${p.enLast}" loading="lazy" />` :
        `<span class="default-avatar">🦊</span>`;

    const displayName = p.displayName || p.lastName || '';
    const numberDisplay = (p.number !== undefined && p.number !== null && p.number !== '') ? p.number : '';

    let teamBadgeHtml = '';
    if (teamLabel) {
        teamBadgeHtml = `<div class="team-badge">${teamLabel}</div>`;
    }

    let positionTagHtml = '';
    if (showPositionTag && p.position) {
        positionTagHtml = `<span class="position-tag ${p.position}">${p.position}</span>`;
    }

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
        </div>
    `;
}

// ================================================================
//  租借列表
// ================================================================
function renderLoanList(players) {
    const container = document.getElementById('loanList');
    if (!container) return;
    if (players.length === 0) {
        container.innerHTML = `<div class="loan-empty">暂无租借球员</div>`;
        return;
    }
    let html = '';
    for (const p of players) {
        const club = p.onLoan.to || '租借中';
        const until = p.onLoan.until || '';
        const numberDisplay = (p.number !== undefined && p.number !== null && p.number !== '') ? p.number : '';
        const displayName = p.displayName || p.lastName || '';
        const fullName = `${p.enFirst || ''} ${p.enLast || ''}`.trim();

        html += `
            <div class="loan-card">
                <div class="loan-card-top">
                    <span class="loan-number">${numberDisplay}</span>
                    <div class="loan-name-group">
                        <span class="loan-display-name">${displayName}</span>
                        <span class="loan-full-name">${fullName}</span>
                    </div>
                </div>
                <div class="loan-card-bottom">
                    <span class="loan-club"><i class="fas fa-arrow-right"></i> ${club}</span>
                    ${until ? `<span class="loan-until">📅 ${until}</span>` : ''}
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ================================================================
//  辅助函数
// ================================================================
function getFlagClass(code) {
    const upper = code.toUpperCase();
    if (upper === 'GB') return 'gb-eng';
    if (upper.startsWith('GB-')) {
        const suffix = upper.substring(3);
        return 'gb-' + suffix.toLowerCase();
    }
    return code.toLowerCase();
}

function getAvatarUrl(avatar) {
    if (!avatar) return null;
    if (avatar.startsWith('/uploads/')) {
        return `${API_BASE.replace('/api', '')}${avatar}`;
    }
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }
    return avatar;
}

// ================================================================
//  绑定编辑按钮
// ================================================================
function bindEditButtons() {
    document.querySelectorAll('.btn-edit-card').forEach(btn => {
        // 移除之前绑定的事件，防止重复
        btn.replaceWith(btn.cloneNode(true));
    });
    // 重新获取克隆后的按钮
    document.querySelectorAll('.btn-edit-card').forEach(btn => {
        btn.style.display = isAdmin ? 'flex' : 'none';
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isAdmin) {
                showToast('⚠️ 请先登录管理员');
                return;
            }
            const idx = parseInt(this.dataset.index);
            if (isNaN(idx)) {
                showToast('⚠️ 无法获取球员索引');
                return;
            }
            openEditModal(idx);
        });
    });
}

// ================================================================
//  分类切换（仅当存在 .btn-toggle 时）
// ================================================================
const toggleBtns = document.querySelectorAll('.btn-toggle');
if (toggleBtns.length) {
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            toggleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            sortMode = this.dataset.mode;
            renderView(currentView);
        });
    });
}

// ================================================================
//  模态框逻辑（完整）
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

// 拖拽事件（仅当元素存在）
if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleFile(file);
            } else {
                showToast('⚠️ 请拖拽图片文件');
            }
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        currentAvatarData = dataUrl;
        formAvatar.value = dataUrl;
        showPreview(dataUrl);
        showToast('✅ 头像已预览');
    };
    reader.onerror = function() {
        showToast('⚠️ 图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
}

function showPreview(dataUrl) {
    if (previewImg) previewImg.src = dataUrl;
    if (avatarPreview) avatarPreview.style.display = 'block';
    if (dropIcon) dropIcon.style.display = 'none';
    if (dropText) dropText.style.display = 'none';
    const hint = dropZone ? dropZone.querySelector('.drop-hint') : null;
    if (hint) hint.style.display = 'none';
}

function hidePreview() {
    if (avatarPreview) avatarPreview.style.display = 'none';
    if (dropIcon) dropIcon.style.display = 'block';
    if (dropText) dropText.style.display = 'block';
    const hint = dropZone ? dropZone.querySelector('.drop-hint') : null;
    if (hint) hint.style.display = 'block';
    if (previewImg) previewImg.src = '';
    currentAvatarData = '';
    if (formAvatar) formAvatar.value = '';
}

if (clearAvatarBtn) {
    clearAvatarBtn.addEventListener('click', function(e) {
        e.preventDefault();
        hidePreview();
        if (fileInput) fileInput.value = '';
        showToast('🗑️ 头像已移除');
    });
}

function resetDropZone() {
    hidePreview();
    if (fileInput) fileInput.value = '';
    if (dropZone) dropZone.classList.remove('dragover');
}

// ================================================================
//  打开 / 关闭模态框
// ================================================================
function openEditModal(index) {
    if (!isAdmin) {
        showToast('⚠️ 请先登录管理员');
        return;
    }
    if (!modalOverlay || !editIndex || !modalTitle || !formSubmit || !btnDelete) {
        showToast('⚠️ 模态框元素未加载，请刷新页面');
        return;
    }
    const isNew = index === -1;
    editIndex.value = index;
    resetDropZone();

    if (isNew) {
        modalTitle.innerHTML = '<i class="fas fa-plus" style="color:#FDBE11;"></i> 添加球员';
        formSubmit.textContent = '添加';
        btnDelete.style.display = 'none';
        document.getElementById('formNumber').value = '';
        document.getElementById('formDisplayName').value = '';
        document.getElementById('formEnFirst').value = '';
        document.getElementById('formEnLast').value = '';
        document.getElementById('formFirstName').value = '';
        document.getElementById('formLastName').value = '';
        document.getElementById('formPosition').value = '';
        document.getElementById('formTeam').value = '';
        formAvatar.value = '';
        currentAvatarData = '';
        document.getElementById('formNationality').value = '';
        loanSelect.value = '';
        document.getElementById('formLoanClub').value = '';
        document.getElementById('formLoanUntil').value = '';
        loanClubGroup.style.display = 'none';
    } else {
        const p = squadData[index];
        if (!p) {
            showToast('⚠️ 未找到球员数据');
            return;
        }
        modalTitle.innerHTML = '<i class="fas fa-pen" style="color:#FDBE11;"></i> 编辑球员';
        formSubmit.textContent = '保存';
        btnDelete.style.display = 'block';
        document.getElementById('formNumber').value = p.number !== undefined && p.number !== null ? p.number : '';
        document.getElementById('formDisplayName').value = p.displayName || p.lastName || '';
        document.getElementById('formEnFirst').value = p.enFirst || '';
        document.getElementById('formEnLast').value = p.enLast || '';
        document.getElementById('formFirstName').value = p.firstName || '';
        document.getElementById('formLastName').value = p.lastName || '';
        document.getElementById('formPosition').value = p.position || '';
        document.getElementById('formTeam').value = p.team || '';
        if (p.avatar) {
            currentAvatarData = p.avatar;
            formAvatar.value = p.avatar;
            showPreview(p.avatar);
        } else {
            resetDropZone();
        }
        document.getElementById('formNationality').value = Array.isArray(p.nationality) ? p.nationality.join(',') :
            p.nationality || '';
        if (p.onLoan) {
            loanSelect.value = '租借中';
            document.getElementById('formLoanClub').value = p.onLoan.to || '';
            document.getElementById('formLoanUntil').value = p.onLoan.until || '';
            loanClubGroup.style.display = 'block';
        } else {
            loanSelect.value = '';
            document.getElementById('formLoanClub').value = '';
            document.getElementById('formLoanUntil').value = '';
            loanClubGroup.style.display = 'none';
        }
    }
    modalOverlay.classList.add('active');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    resetDropZone();
}

if (loanSelect) {
    loanSelect.addEventListener('change', function() {
        loanClubGroup.style.display = this.value === '租借中' ? 'block' : 'none';
    });
}

// ================================================================
//  保存球员
// ================================================================
if (playerForm) {
    playerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!isAdmin) {
            showToast('⚠️ 请先登录管理员');
            return;
        }

        const idx = parseInt(editIndex.value);
        let id = null;
        if (idx !== -1 && squadData[idx] && squadData[idx].id) {
            id = squadData[idx].id;
        }

        const formData = new FormData();
        if (id) formData.append('id', id);
        formData.append('number', document.getElementById('formNumber').value || '');
        formData.append('displayName', document.getElementById('formDisplayName').value || '');
        formData.append('enFirst', document.getElementById('formEnFirst').value || '');
        formData.append('enLast', document.getElementById('formEnLast').value || '');
        formData.append('firstName', document.getElementById('formFirstName').value || '');
        formData.append('lastName', document.getElementById('formLastName').value || '');
        formData.append('position', document.getElementById('formPosition').value || '');
        formData.append('team', document.getElementById('formTeam').value || '');

        const natStr = document.getElementById('formNationality').value.trim();
        let nationality = natStr ? natStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0) : ['GB'];
        formData.append('nationality', JSON.stringify(nationality));

        const loanStatus = loanSelect.value;
        const loanClub = document.getElementById('formLoanClub').value.trim();
        const loanUntil = document.getElementById('formLoanUntil').value.trim();
        let onLoan = null;
        if (loanStatus === '租借中') {
            onLoan = { to: loanClub || '租借中', until: loanUntil || '' };
        }
        formData.append('onLoan', JSON.stringify(onLoan));

        if (fileInput && fileInput.files.length > 0) {
            formData.append('avatar', fileInput.files[0]);
        } else if (formAvatar.value) {
            formData.append('avatar', formAvatar.value);
        }

        try {
            const res = await fetch(`${API_BASE}/players`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` },
                body: formData
            });
            const result = await res.json();
            if (result.success) {
                showToast('✅ 球员已保存');
                await loadData();
                renderView(currentView);
                closeModal();
            } else {
                showToast('⚠️ 保存失败: ' + (result.error || '未知错误'));
            }
        } catch (err) {
            console.error(err);
            showToast('⚠️ 网络错误，请检查服务器是否运行');
        }
    });
}

// ================================================================
//  删除球员
// ================================================================
if (btnDelete) {
    btnDelete.addEventListener('click', async function() {
        if (!isAdmin) {
            showToast('⚠️ 请先登录管理员');
            return;
        }
        const idx = parseInt(editIndex.value);
        if (idx === -1) return;
        if (!confirm('确定要删除该球员吗？')) return;

        const p = squadData[idx];
        if (!p || !p.id) {
            showToast('⚠️ 无法获取球员 ID');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/players/${p.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (res.ok) {
                showToast('🗑️ 球员已删除');
                await loadData();
                renderView(currentView);
                closeModal();
            } else {
                showToast('⚠️ 删除失败');
            }
        } catch (err) {
            console.error(err);
            showToast('⚠️ 网络错误');
        }
    });
}

// ================================================================
//  关闭模态框
// ================================================================
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}
if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

// ================================================================
//  添加球员按钮（大名单）
// ================================================================
const btnAdd = document.getElementById('btnAddPlayer');
if (btnAdd) {
    btnAdd.addEventListener('click', function() {
        if (!isAdmin) {
            showToast('⚠️ 请先登录管理员');
            return;
        }
        document.getElementById('formTeam').value = 'first';
        openEditModal(-1);
    });
}

// ================================================================
//  添加球员按钮（梯队）
// ================================================================
const btnAcademy = document.getElementById('btnAddAcademyPlayer');
if (btnAcademy) {
    btnAcademy.addEventListener('click', function() {
        if (!isAdmin) {
            showToast('⚠️ 请先登录管理员');
            return;
        }
        document.getElementById('formTeam').value = '';
        openEditModal(-1);
    });
}

// ================================================================
//  Toast 提示
// ================================================================
function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ================================================================
//  初始化
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    await verifyToken();
    await loadData();
    switchView('squad');
});