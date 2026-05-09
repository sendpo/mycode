document.addEventListener('DOMContentLoaded', function () {
    // 获取 URL 参数
    function getVideoUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('url') || '';
    }

    // 视频地址
    const videoUrl = decodeURIComponent(getVideoUrl());

    // 没有视频参数
    if (!videoUrl) {
        document.querySelector('.artplayer-app').innerHTML = `
            <div class="empty-box">
                请在地址后添加 ?url=视频地址
            </div>
        `;
        throw new Error('No video url');
    }

    // 自动识别格式
    function getVideoType(url) {
        url = url.toLowerCase();
        if (url.includes('.m3u8')) return 'm3u8';
        if (url.includes('.flv')) return 'flv';
        if (url.includes('.mpd')) return 'dash';
        if (url.includes('.mp4')) return 'mp4';
        if (url.includes('.webm')) return 'webm';
        if (url.includes('.ogg')) return 'ogg';
        return 'auto';
    }

    const videoType = getVideoType(videoUrl);

    const art = new Artplayer({
        container: '.artplayer-app',
        url: videoUrl,
        type: videoType,
        customType: {
            // HLS
            m3u8: function (video, url, art) {
                if (Hls.isSupported()) {
                    if (art.hls) art.hls.destroy();
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    art.hls = hls;
                    art.on('destroy', () => hls.destroy());
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                } else {
                    art.notice.show = '当前浏览器不支持 HLS';
                }
            },

            // FLV
            flv: function (video, url, art) {
                if (flvjs.isSupported()) {
                    if (art.flv) art.flv.destroy();
                    const flvPlayer = flvjs.createPlayer({ type: 'flv', url: url });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                    art.flv = flvPlayer;
                    art.on('destroy', () => flvPlayer.destroy());
                } else {
                    art.notice.show = '当前浏览器不支持 FLV';
                }
            },

            // DASH
            dash: function (video, url, art) {
                const player = dashjs.MediaPlayer().create();
                player.initialize(video, url, false);
                art.dash = player;
                art.on('destroy', () => player.reset());
            },
        },

        autoMini: true,
        playbackRate: true,
        setting: true,
        fullscreen: true,
        aspectRatio: true,
        screenshot: true,
        pip: true,

        subtitle: {
            url: 'https://cdn.jsdelivr.net/gh/sendpo/subtitles@refs/heads/main/vtt/maccms10.vtt',
            type: 'vtt',
            encoding: 'utf-8',
            style: {
                color: '#03A9F4',
                'font-size': '20px',
            },
        },
    });
});