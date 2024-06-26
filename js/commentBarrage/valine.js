function initializeCommentBarrage() {
    window.commentBarrageInitialized = !0;
    let config = {
        maxBarrage: 1,
        barrageTime: 8e3,
        valineUrl: GLOBAL_CONFIG.comment.url,
        pageUrl: window.location.pathname,
    }
    new class {
        commentInterval = null

        constructor(config) {
            this.config = {
                ...config,
                barrageTimer: [],
                barrageList: [],
                barrageIndex: 0,
                dom: document.querySelector(".comment-barrage")
            };
            this.commentInterval = null;
            this.hoverOnCommentBarrage = false;
            this.init();
        }

        async fetchComments() {
            const url = new URL(`${this.config.valineUrl}/1.1/classes/Comment`);
            const params = {
                url: this.config.pageUrl,
                order: '-createdAt'
            };

            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }

            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "X-LC-Id": GLOBAL_CONFIG.comment.appId,
                        "X-LC-Key": GLOBAL_CONFIG.comment.appKey,
                        "Content-Type": "application/json"
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data.results.filter(item => item.url === this.config.pageUrl)
            } catch (error) {
                console.error("An error occurred while fetching comments: ", error);
            }
        }

        commentLinkFilter(comments) {
            return comments.flatMap(comment => this.getCommentReplies(comment));
        }

        getCommentReplies(comment) {
            window.comment = comment
            if (!comment.replies) {
                return [comment];
            }
            return [comment, ...comment.replies.flatMap(reply => this.getCommentReplies(reply))];
        }

        processCommentContent(comment) {
            const processed = comment.replace(/```[\s\S]*?```|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<[^>]*>|\n|`([^`]{1,9})`:/g, "").trim();
            return processed ? `<p>${processed}</p>` : "";
        }

        createCommentBarrage(comment) {
            const content = this.processCommentContent(comment.comment).trim();
            if (!content) {
                return false;
            }

            const element = document.createElement("div");
            element.classList.add("comment-barrage-item");
            element.innerHTML = `
        <div class="barrageHead">
            <a class="barrageTitle" href="javascript:sco.scrollTo('post-comment')">${GLOBAL_CONFIG.lang.barrage.title}</a>
            <div class="barrageNick">${comment.nick}</div>
            <img class="barrageAvatar" src="${GLOBAL_CONFIG.comment.avatar}/avatar/${md5(comment.mail.toLowerCase())}"/>
            <a class="comment-barrage-close" href="javascript:sco.switchCommentBarrage();">
                <i class="solitude st-close-fill"></i>
            </a>
        </div>
        <a class="barrageContent" href="javascript:sco.scrollTo('${comment.objectId}');">${comment.comment}</a>
    `;

            this.config.dom.appendChild(element);
            this.config.barrageTimer.push(element);

            return true;
        }

        removeCommentBarrage(element) {
            element.className = "comment-barrage-item out";
            setTimeout(() => {
                this.config.dom.removeChild(element);
            }, 1000);
        }

        async initCommentBarrage() {
            const commentBarrage = document.querySelector(".comment-barrage");
            const menuCommentBarrageText = document.querySelector(".menu-commentBarrage-text");
            const consoleCommentBarrage = document.querySelector("#consoleCommentBarrage");

            if (localStorage.getItem("commentBarrageSwitch") != null) {
                commentBarrage.style.display = "flex";
                consoleCommentBarrage.classList.add("on");
            } else {
                commentBarrage.style.display = "none";
                consoleCommentBarrage.classList.remove("on");
            }

            const comments = await this.fetchComments();
            this.config.barrageList = this.commentLinkFilter(comments);
            this.config.dom.innerHTML = "";
            clearInterval(this.commentInterval);
            this.commentInterval = null;

            const createOrRemoveBarrage = () => {
                if (this.config.barrageList.length && !this.hoverOnCommentBarrage) {
                    if (!this.createCommentBarrage(this.config.barrageList[this.config.barrageIndex])) {
                        this.config.barrageIndex = (this.config.barrageIndex + 1) % this.config.barrageList.length;
                        return createOrRemoveBarrage();
                    }
                    this.config.barrageIndex = (this.config.barrageIndex + 1) % this.config.barrageList.length;
                }
                if (this.config.barrageTimer.length > (this.config.barrageList.length > this.config.maxBarrage ? this.config.maxBarrage : this.config.barrageList.length) && !this.hoverOnCommentBarrage) {
                    this.removeCommentBarrage(this.config.barrageTimer.shift());
                }
            };

            setTimeout(() => {
                createOrRemoveBarrage();
                if (this.commentInterval) {
                    clearInterval(this.commentInterval);
                }
                this.commentInterval = setInterval(createOrRemoveBarrage, this.config.barrageTime);
            }, 3000);
        }

        async init() {
            await this.initCommentBarrage();
            const commentBarrage = document.querySelector(".comment-barrage");
            commentBarrage.addEventListener('mouseover', () => this.hoverOnCommentBarrage = true);
            commentBarrage.addEventListener('mouseout', () => this.hoverOnCommentBarrage = false);
        }
    }
    (config)
}