(() => {
    function jobImage(jobName, detail = false) {
        const wrap = document.createElement('div');
        wrap.className = `card-media ${detail ? 'card-media-detail' : 'card-media-compact'} job-media`;
        const img = document.createElement('img');
        img.src = `jobsprite/${encodeURIComponent(jobName)}.png`;
        img.alt = jobName;
        img.loading = 'lazy';
        img.onerror = () => wrap.remove();
        wrap.appendChild(img);
        return wrap;
    }

    function decorateJobList() {
        document.querySelectorAll('.list-card[data-key]').forEach(card => {
            if (card.querySelector('.job-media')) return;
            card.prepend(jobImage(card.dataset.key, false));
        });
    }

    function decorateJobDetail(jobName) {
        const titleCard = document.querySelector('.detail-title-card');
        if (!titleCard || titleCard.querySelector('.job-media')) return;
        titleCard.prepend(jobImage(jobName, true));
    }

    const originalLoadView = window.loadView;
    window.loadView = function(view) {
        const result = originalLoadView.apply(this, arguments);
        if (String(view).toLowerCase() === 'jobs') decorateJobList();
        return result;
    };

    const originalLoadDetail = window.loadDetail;
    window.loadDetail = async function(cat, key) {
        const result = await originalLoadDetail.apply(this, arguments);
        if (String(cat).toLowerCase() === 'jobs') decorateJobDetail(key);
        return result;
    };
})();
