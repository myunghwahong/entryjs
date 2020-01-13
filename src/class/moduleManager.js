/*
 * TODO 하드웨어가 아닌 기타 타입의 모듈도 수용할 수 있도록 정의
 *  현재, 하드웨어만 로드할거기 때문에 하드웨어 로컬서버에 블록을 요청을 하고 있다.
 *  만약 확장블록이나 카테고리 전체를 가지는 친구라면 타입 프로퍼티로 분기하여
 *  엔트리 서버에 다이렉트로 모듈 요청을 해야할 것이다.
 */
Entry.moduleManager = new (class {
    /**
     * 해당 url 을 동적으로 로드한다.
     * 해당 함수는 굉장히 위험하므로 추가적인 방어로직이 필요하다.
     * @param moduleName {string} 로드할 모듈명
     * @return Promise
     */
    loadExternalModule(moduleName) {
        if (!Entry.EXTERNAL_MODULE_LIST) {
            Entry.EXTERNAL_MODULE_LIST = [];
        } else if (Entry.EXTERNAL_MODULE_LIST.includes(moduleName)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const scriptElementId = `entryModuleScript${Date.now()}`;

            if (!moduleName) {
                return;
            }
            const scriptElement = document.createElement('script');
            scriptElement.id = scriptElementId;

            scriptElement.onload = () => {
                if (!Entry.EXTERNAL_MODULE_LIST) {
                    Entry.EXTERNAL_MODULE_LIST = [];
                }
                Entry.EXTERNAL_MODULE_LIST.push(moduleName);
                scriptElement.remove();
                resolve();
            };
            scriptElement.onerror = (e) => {
                scriptElement.remove();
                reject(e);
            };

            scriptElement.src = `${EntryStatic.moduleBaseUrl}${moduleName}/files/block`;

            // noinspection JSCheckFunctionSignatures
            document.body.appendChild(scriptElement);
        });
    }

    /**
     * [!] 외부에서 사용하는 함수입니다. 모듈화된 블록이 엔트리 등록을 위해 사용하는 함수임
     * 각 블록정보가 존재해야할 위치에 모든 데이터를 뿌려준다. 위치는 아래와 같다
     * - Entry.HARDWARE_LIST
     * - Entry.block : 실제 블록 정보를 담는다.
     *
     * 워크스페이스 리로드시 정보가 저장되지 않는다.
     * 이 후 블록메뉴에 블록들을 실시간으로 추가한 뒤 reDraw 한다.
     * @param moduleObject 하드웨어 모듈. 여타 하드웨어 모듈 파일 참조
     */
    registerHardwareModule(moduleObject) {
        if (!moduleObject.getBlocks || !moduleObject.blockMenuBlocks) {
            return;
        }

        if (typeof moduleObject.id === 'string') {
            Entry.HARDWARE_LIST[moduleObject.id] = moduleObject;
        } else if (moduleObject.id instanceof Array) {
            moduleObject.id.forEach((id) => {
                Entry.HARDWARE_LIST[id] = moduleObject;
            });
        }

        this._setLanguageTemplates(moduleObject);
        const blockObjects = moduleObject.getBlocks();
        const blockMenuBlocks = moduleObject.blockMenuBlocks;
        const blockMenu = Entry.getMainWS().blockMenu;

        Object.entries(blockObjects).forEach(([blockName, block]) => {
            Entry.block[blockName] = block;

            if (blockMenuBlocks.indexOf(blockName) > -1) {
                blockMenu.addCategoryData('arduino', blockName);
            }
        });
        Entry.hw.setExternalModule(moduleObject);
        Entry.dispatchEvent('hwChanged');
    }

    /**
     * TODO 리로드 되는 경우 다시 불러오지 않기 때문에 템플릿정보 저장이 필요함
     */
    _setLanguageTemplates(moduleObject) {
        if (moduleObject.setLanguage) {
            const langTemplate = moduleObject.setLanguage();
            const data = langTemplate[Lang.type] || langTemplate[Lang.fallbackType];
            for (const key in data) {
                Object.assign(Lang[key], data[key]);
            }
        }
    }
})();
