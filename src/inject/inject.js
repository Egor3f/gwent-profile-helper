const PREFIX = 'gwent-profile-helper:';
const CACHE_LIFETIME = 10 * 60 * 1000;

let CURRENT_LANG = window.location.pathname.split('/')[1];
CURRENT_LANG = CURRENT_LANG && CURRENT_LANG.length === 2 ? CURRENT_LANG : 'en';


function getPlayerUrl(nick) {
	return `https://www.playgwent.com/${CURRENT_LANG}/profile/${nick}`;
}

function parseNumber(element) {
	const res = /\d+/.exec(element.textContent);
	return res ? parseInt(res[0]) : null;
}

function sleep(timeMs) {
	return new Promise((resolve) => setTimeout(resolve, timeMs));
}

function loadCachedStats(nick) {
	const res = window.localStorage.getItem(PREFIX + nick);
	if(res && +Date.now() - res['timestamp'] <= CACHE_LIFETIME) return res['stats'];
}
function saveCachedStats(nick, stats) {
	window.localStorage.setItem(PREFIX + nick, stats);
}

function extractPlayerStats(html) {
	const winsElement = html.querySelector('table.c-statistics-table.current-ranked > tbody > tr:nth-child(2) > td:nth-child(2)');
	const losesElement = html.querySelector('table.c-statistics-table.current-ranked > tbody > tr:nth-child(3) > td:nth-child(2)');
	const prestigeElement = html.querySelector('span.l-player-details__prestige > strong');
	const rankElement = html.querySelector('span.l-player-details__rank > strong');
	if(!winsElement || !losesElement || !prestigeElement || !rankElement) return null;
	return {
		wins: parseNumber(winsElement),
		loses: parseNumber(losesElement),
		prestige: parseNumber(prestigeElement),
		rank: parseNumber(rankElement),
	};
}

async function getPlayerStats(nick) {
	/*const cachedStats = loadCachedStats(nick);
	if(cachedStats) return cachedStats;*/
	console.log(`${PREFIX} Loading player stats: ${nick}`);
	const response = await fetch(getPlayerUrl(nick));
	const page = await response.text();
	const domParser = new DOMParser();
	const html = domParser.parseFromString(page, 'text/html');

	const stats = extractPlayerStats(html);
	console.log(`${PREFIX} Result: ${JSON.stringify(stats)}`);
	// saveCachedStats(nick, stats);
	return stats;
}

function showMyWinrate() {
	const stats = extractPlayerStats(document);
	if(!stats) return;
	const elem = document.querySelector('.l-player-details__basic');
	if(!elem) return;
	const winrateSpan = document.createElement('span');
	const winrate = (stats.wins / (stats.wins + stats.loses) * 100).toFixed(2);
	winrateSpan.innerHTML = `${winrate} %`;
	winrateSpan.className = 'l-player-details gph-winrate gph-winrate-large';
	winrateSpan.title = 'Current Ranked Season Winrate (added by helper extension)';
	elem.appendChild(winrateSpan);
}

async function main() {
	showMyWinrate();

	for(let elem of document.querySelectorAll('#history > table > tbody > tr > td:nth-child(4)')) {
		const nick = elem.textContent.trim();
		const nameNode = Array.from(elem.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)[0];
		if(nameNode) {
			const linkNode = document.createElement('a');
			linkNode.innerText = nick;
			linkNode.setAttribute('href', getPlayerUrl(nick));
			linkNode.setAttribute('target', '_blank');
			linkNode.className = 'gph-link';
			elem.removeChild(nameNode);
			elem.appendChild(linkNode);
		}

		const stats = await getPlayerStats(nick);
		if(!stats) continue;

		const container = document.createElement('div');
		container.className = 'gph-container';

		const prestigeSpan = document.createElement('span');
		prestigeSpan.innerHTML = `<strong>${stats.prestige}</strong>`;
		prestigeSpan.className = 'l-player-details__prestige l-player-details__prestige--0 gph-prestige';
		container.appendChild(prestigeSpan);

		const rankSpan = document.createElement('span');
		rankSpan.innerHTML = `<strong>${stats.rank}</strong>`;
		rankSpan.className = 'l-player-details__rank gph-rank';
		container.appendChild(rankSpan);

		const winrateSpan = document.createElement('span');
		const winrate = (stats.wins / (stats.wins + stats.loses) * 100).toFixed(2);
		winrateSpan.innerHTML = `${winrate} %`;
		winrateSpan.className = 'l-player-details gph-winrate';
		winrateSpan.title = `Wins: ${stats.wins}   Losses: ${stats.loses}`;
		container.appendChild(winrateSpan);

		elem.appendChild(container);
		// await sleep(1);
	}
}

// noinspection JSIgnoredPromiseFromCall
main();
