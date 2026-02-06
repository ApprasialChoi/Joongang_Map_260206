// Kakao Maps를 Leaflet 배경지도로 사용하기 위한 간단한 브리지.
// - Kakao는 바닥(div #kakao-map)에 렌더링
// - Leaflet은 투명 배경으로 위에 렌더링
// - 사용자는 Leaflet로만 조작(줌/이동)하고, Kakao는 이를 따라감

(function () {
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Leaflet zoom(대개 0~19) -> Kakao level(1~14) 근사 변환
  // 경험적으로 "level = 20 - zoom" 정도가 가장 무난합니다.
  function leafletZoomToKakaoLevel(zoom) {
    var level = Math.round(20 - zoom);
    return clamp(level, 1, 14);
  }

  function kakaoMapTypeFromString(mapTypeId) {
    // 'SKYVIEW'(위성) / 'ROADMAP'(일반) / 'HYBRID'(하이브리드)
    if (!mapTypeId) return kakao.maps.MapTypeId.SKYVIEW;
    var key = String(mapTypeId).toUpperCase();
    if (key === 'ROADMAP') return kakao.maps.MapTypeId.ROADMAP;
    if (key === 'HYBRID') return kakao.maps.MapTypeId.HYBRID;
    return kakao.maps.MapTypeId.SKYVIEW;
  }

  // 글로벌로 노출(HTML에서 바로 호출)
  window.initKakaoBaseMap = function initKakaoBaseMap(leafletMap, opts) {
    if (!window.kakao || !kakao.maps) {
      throw new Error('Kakao Maps SDK가 로드되지 않았습니다.');
    }
    if (!leafletMap) {
      throw new Error('Leaflet map 인스턴스가 필요합니다.');
    }

    opts = opts || {};
    var container = document.getElementById('kakao-map');
    if (!container) {
      throw new Error('DOM에 #kakao-map 컨테이너가 없습니다.');
    }

    // Leaflet 최초 뷰를 기준으로 Kakao 초기화
    var c = leafletMap.getCenter();
    var z = leafletMap.getZoom();
    var kakaoMap = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(c.lat, c.lng),
      level: leafletZoomToKakaoLevel(z),
      mapTypeId: kakaoMapTypeFromString(opts.mapTypeId)
    });

    // 배경지도는 클릭/드래그/휠을 받지 않도록(Leaflet만 조작)
    kakaoMap.setDraggable(false);
    kakaoMap.setZoomable(false);

    // Leaflet 이동/줌을 Kakao에 반영
    function syncToKakao() {
      var center = leafletMap.getCenter();
      kakaoMap.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
      kakaoMap.setLevel(leafletZoomToKakaoLevel(leafletMap.getZoom()), { animate: false });
    }

    leafletMap.on('move', syncToKakao);
    leafletMap.on('zoom', syncToKakao);
    leafletMap.on('moveend', syncToKakao);
    leafletMap.on('zoomend', syncToKakao);

    // Leaflet 컨테이너 크기 변화 시 Kakao relayout 필요
    function relayout() {
      kakaoMap.relayout();
      syncToKakao();
    }
    window.addEventListener('resize', relayout);

    // 초기 1회 동기화
    setTimeout(relayout, 0);

    // 필요 시 외부에서 접근 가능하게 반환/노출
    leafletMap._kakaoBaseMap = kakaoMap;
    return kakaoMap;
  };
})();

