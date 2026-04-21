// 页面核心逻辑
let currentPage = 1;
let totalPages = 1;
let currentSource = localStorage.getItem('source') || '';
let isSearching = false; // 是否处于搜索模式
let searchKeyword = ''; // 当前搜索关键词

document.addEventListener('DOMContentLoaded', async () => {
  // 1️⃣ 先加载源配置
  await loadSources();

  // 2️⃣ 初始化源选择
  const select = document.getElementById('sourceSelect');
  if (!currentSource) {
    currentSource = select.options[0]?.value || '';
    localStorage.setItem('source', currentSource);
  }
  select.value = currentSource;

  // 3️⃣ 首次加载数据
  fetchMovies(currentPage);

  // 4️⃣ 源变化事件
  select.addEventListener('change', (e) => {
    currentSource = e.target.value;
    localStorage.setItem('source', currentSource);
    currentPage = 1;
    isSearching = false; // 退出搜索模式
    searchKeyword = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').classList.add('hidden');
    fetchMovies(currentPage, true);
  });

  // 5️⃣ 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    isSearching = false;
    searchKeyword = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').classList.add('hidden');
    fetchMovies(currentPage, true);
  });

  // 分页按钮
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1 && !isSearching) { // 仅普通模式可用
      currentPage--;
      fetchMovies(currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages && !isSearching) { // 仅普通模式可用
      currentPage++;
      fetchMovies(currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // 搜索相关事件
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').classList.add('hidden');
    isSearching = false;
    searchKeyword = '';
    currentPage = 1;
    fetchMovies(currentPage); // 回到普通列表
  });
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const clearBtn = document.getElementById('clearSearch');
    clearBtn.classList.toggle('hidden', !e.target.value);
  });

  // 重试按钮
  document.getElementById('retryBtn').addEventListener('click', () => {
    fetchMovies(currentPage, true);
  });
});

// 🔹 动态加载 source.json（每天刷新）
async function loadSources() {
  try {
    // 生成当天日期作为版本号，例如：20251116
    const dateVersion = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const url = `https://cdn.jsdelivr.net/gh/sendpo/mycode@refs/heads/main/json/fuli.json?v=${dateVersion}`;
    console.log("加载源 URL:", url);

    const res = await fetch(url, { cache: 'no-store' });
    const list = await res.json();

    const select = document.getElementById('sourceSelect');
    select.innerHTML = '';

    list.forEach(src => {
      const opt = document.createElement('option');
      opt.value = src.id;
      opt.textContent = src.name;
      select.appendChild(opt);
    });
  } catch (err) {
    alert('加载源配置失败: ' + err.message);
  }
}

// 🔹 获取电影数据
async function fetchMovies(page, forceRefresh = false) {
  showLoading();
  try {
    const url = `https://movieapi.sendpo.cn/fuli/${currentSource}.php?ac=detail&pg=${page}`;
    console.log('请求URL:', url);

    const response = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' });
    const data = await response.json();

    if (data.code === 1 && Array.isArray(data.list)) {
      totalPages = data.pagecount || 1;
      currentPage = data.page || 1;
      renderMovieList(data.list);
      updatePagination();
      document.getElementById('movieList').classList.remove('hidden');
      document.getElementById('pagination').classList.remove('hidden');
      document.getElementById('loading').classList.add('hidden');
    } else {
      showEmpty();
    }
  } catch (error) {
    console.error('获取数据失败:', error);
    showError();
  }
}

// 🔹 处理搜索逻辑
async function handleSearch() {
  searchKeyword = document.getElementById('searchInput').value.trim();
  if (!searchKeyword) return;

  isSearching = true;
  showLoading();

  try {
    const searchUrl = `https://movieapi.sendpo.cn/fuli/fuli_search.php?keyword=${encodeURIComponent(searchKeyword)}`;
    console.log('搜索请求URL:', searchUrl);

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.code === 1 && Array.isArray(data.list)) {
      // 隐藏分页，渲染搜索结果
      document.getElementById('pagination').classList.add('hidden');
      document.getElementById('movieList').classList.remove('hidden');
      document.getElementById('loading').classList.add('hidden');

      if (data.list.length === 0) {
        showEmpty('暂无搜索结果');
        return;
      }

      renderMovieList(data.list, true); // 第二个参数标记为搜索结果
    } else {
      showEmpty('暂无搜索结果');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    showError();
  }
}

// 🔹 渲染电影卡片（支持搜索结果来源显示）
function renderMovieList(movies, isSearchResult = false) {
  const container = document.getElementById('movieList');
  container.innerHTML = '';

  if (!movies.length) {
    showEmpty(isSearchResult ? '暂无搜索结果' : '暂无数据');
    return;
  }

  movies.forEach((movie, index) => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl overflow-hidden card-shadow card-hover cursor-pointer fade-in';
    card.style.animationDelay = `${index * 0.05}s`;

    // 修改点击事件，在新标签页打开详情页
    card.addEventListener('click', (event) => {
      // 阻止事件冒泡
      event.preventDefault();
      event.stopPropagation();

      // 保存当前电影数据到localStorage
      localStorage.setItem('currentMovie', JSON.stringify(movie));

      // 在新标签页打开详情页
      window.open('fuli-detail.php', '_blank');
    });

    card.innerHTML = `
      <div class="relative overflow-hidden aspect-[2/3] bg-gradient-to-br from-gray-100 to-gray-200">
        <img src="${movie.pic || 'https://picsum.photos/400/600?grayscale&blur=2'}" 
             alt="${movie.name}" 
             class="w-full h-full object-cover image-zoom"
             onerror="this.src='https://picsum.photos/400/600?grayscale&blur=2'">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 card-hover:opacity-100"></div>
        
        <!-- 左上角显示类型名称 -->
        <div class="absolute top-2 left-2 bg-gray-800/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
          ${movie.type_name || '未知类型'}
        </div>
        
        <!-- 搜索模式下右上角显示来源，避免冲突 -->
        ${isSearchResult && movie.source ? `
          <div class="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">
            ${movie.source}
          </div>
        ` : ''}
        
        <!-- 更新信息移至右下角，避免与左上角信息冲突 -->
        <div class="absolute bottom-2 right-2 bg-accent text-white text-xs px-2 py-1 rounded-full font-medium">
          ${movie.update_info || '未知'}
        </div>
        
        <div class="absolute bottom-3 left-3 right-3 text-white opacity-0 transition-opacity duration-300 card-hover:opacity-100">
          <button class="w-full bg-primary hover:bg-primary/90 text-white text-sm py-2 rounded-lg transition-colors flex items-center justify-center">
            <i class="fa fa-play mr-1"></i> 查看详情
          </button>
        </div>
      </div>
      <div class="p-4">
        <!-- 标题添加title属性，鼠标悬停显示完整内容 -->
        <h3 class="font-bold text-lg mb-2 line-clamp-2 h-14" title="${movie.name || '未知名称'}">
          ${movie.name || '未知名称'}
        </h3>
        ${movie.note ? `<p class="text-xs text-accent mt-1">${movie.note}</p>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// 🔹 分页信息
function updatePagination() {
  document.getElementById('pageInfo').textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
  document.getElementById('prevPage').disabled = currentPage <= 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// 🔹 状态显示控制
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('empty').classList.add('hidden');
  document.getElementById('movieList').classList.add('hidden');
  document.getElementById('pagination').classList.add('hidden');
}

function showError() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('empty').classList.add('hidden');
  document.getElementById('movieList').classList.add('hidden');
  document.getElementById('pagination').classList.add('hidden');
}

// 支持自定义空提示文本
function showEmpty(customText = '暂无数据') {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('empty').classList.remove('hidden');
  document.getElementById('movieList').classList.add('hidden');
  document.getElementById('pagination').classList.add('hidden');
  document.querySelector('#empty p').textContent = customText;
}