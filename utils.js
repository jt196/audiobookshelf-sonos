const axios = require("axios");
var config = require("./config");

const ABS_TOKEN = config.ABS_TOKEN;
console.log("🚀 ~ file: utils.js:5 ~ ABS_TOKEN:", ABS_TOKEN);
const ABS_URI = config.ABS_URI;
console.log("🚀 ~ file: utils.js:7 ~ ABS_URI:", ABS_URI);
const ABS_LIBRARY_ID = config.ABS_LIBRARY_ID;
console.log("🚀 ~ file: utils.js:9 ~ ABS_LIBRARY_ID:", ABS_LIBRARY_ID);

// Network Requests
async function getLibraryItems() {
  console.log("🚀 ~ file: utils.js:13 ~ getLibraryItems ~ getLibraryItems");
  try {
    const config = {
      headers: { Authorization: `Bearer ${ABS_TOKEN}` },
      timeout: 10000,
    };
    console.log(
      "🚀 ~ file: utils.js:17 ~ getLibraryItems ~ ABS_TOKEN:",
      ABS_TOKEN
    );

    let path = `${ABS_URI}/api/libraries/${ABS_LIBRARY_ID}/items`;

    console.log("🚀 ~ file: utils.js:20 ~ getLibraryItems ~ path:", path);
    console.log("🚀 ~ file: utils.js:23 ~ getLibraryItems ~ config:", config);
    const { data } = await axios.get(path, config);
    // console.log("🚀 ~ file: utils.js:28 ~ getLibraryItems ~ data:", data);
    return data;
  } catch (error) {
    console.log(error.response ? error.response.data : error.message);
    console.log(`[getLibraryItems] Error caught. Error: ${error}`);
  }
}

async function getLibraryItem(libraryItemId) {
  console.log("🚀 ~ file: utils.js:31 ~ getLibraryItem ~ getLibraryItem");
  try {
    const config = {
      headers: { Authorization: `Bearer ${ABS_TOKEN}` },
    };

    let path = `${ABS_URI}/api/items/${libraryItemId}`;

    console.log("🚀 ~ file: utils.js:36 ~ getLibraryItem ~ path:", path);
    const { data } = await axios.get(path, config);
    return data;
  } catch (error) {
    console.log(`[getLibraryItem] Error caught. Error: ${error}`);
  }
}

async function getABSProgress(libraryItemId) {
  try {
    const config = {
      headers: { Authorization: `Bearer ${ABS_TOKEN}` },
    };

    let path = `${ABS_URI}/api/me/progress/${libraryItemId}`;

    console.log("🚀 ~ file: utils.js:51 ~ getABSProgress ~ path:", path);
    const { data } = await axios.get(path, config);
    return data;
  } catch (error) {
    console.log(`[getABSProgress] Error caught. Error: ${error}`);
  }
}

async function setProgress(updateObject, progress) {
  console.log("🚀 ~ file: utils.js:63 ~ setProgress ~ setProgress");
  try {
    let libraryItemId = updateObject.libraryItemId;

    const config = {
      headers: { Authorization: `Bearer ${ABS_TOKEN}` },
    };

    let path = `${ABS_URI}/api/me/progress/${libraryItemId}`;

    console.log("🚀 ~ file: utils.js:69 ~ setProgress ~ path:", path);
    const updateData = {
      duration: progress.bookDuration,
      currentTime: progress.progress,
      progress: progress.progress / progress.bookDuration,
    };

    //console.log('updateData', updateData)

    const { data } = await axios.patch(path, updateData, config);
  } catch (error) {
    console.log(`[getABSProgress] Error caught. Error: ${error}`);
  }
}

// Build the Objects
async function buildMediaURI(id) {
  console.log("Build Media URI called!");
  let path = `${ABS_URI}/s/item/${id}?token=${ABS_TOKEN}`;

  console.log("🚀 ~ file: utils.js:89 ~ buildMediaURI ~ path:", path);
  return {
    getMediaURIResult: path,
  };
}

async function buildLibraryMetadataResult(res) {
  console.log(
    "🚀 ~ file: utils.js:99 ~ buildLibraryMetadataResult ~ buildLibraryMetadataResult"
  );
  if (!res || !res.results) {
    return null;
  }

  let libraryItems = res.results;
  let count = res.total;
  let total = count;
  let mediaMetadata = [];

  for (const libraryItem of libraryItems) {
    let authorId =
      libraryItem.media.metadata &&
      libraryItem.media.metadata.authors &&
      libraryItem.media.metadata.authors[0]
        ? libraryItem.media.metadata.authors[0].id
        : null;
    let authorName = authorId
      ? libraryItem.media.metadata.authors[0].name
      : null;
    let narratorId =
      libraryItem.media.metadata &&
      libraryItem.media.metadata.narrators &&
      libraryItem.media.metadata.narrators[0]
        ? libraryItem.media.metadata.narrators[0].id
        : null;
    let narratorName = narratorId
      ? libraryItem.media.metadata.narrators[0].name
      : null;

    var mediaMetadataEntry = {
      itemType: "audiobook",
      id: libraryItem.id,
      // mimeType: libraryItem.media.audioFiles[0].mimeType,
      canPlay: true,
      canResume: true,
      title: libraryItem.media.metadata
        ? libraryItem.media.metadata.title
        : null,
      summary: libraryItem.media.metadata
        ? libraryItem.media.metadata.description
        : null,
      // authorId: authorId,
      author: libraryItem.media.metadata.authorName,
      // narratorId: narratorId,
      narrator: libraryItem.media.metadata.narratorName,
      albumArtURI: `${ABS_URI}/api/items/${libraryItem.id}/cover?token=${ABS_TOKEN}`,
    };

    mediaMetadata.push(mediaMetadataEntry);
  }

  return {
    getMetadataResult: {
      count: count,
      total: total,
      index: 0,
      mediaMetadata: mediaMetadata, // Adjusted here
    },
  };
}

async function buildAudiobookTrackList(libraryItem, progressData) {
  console.log(
    "🚀 ~ file: utils.js:147 ~ buildAudiobookTrackList ~ buildAudiobookTrackList"
  );
  if (!libraryItem || !libraryItem.media || !libraryItem.media.audioFiles) {
    return null;
  }

  let tracks = libraryItem.media.audioFiles;
  let icount = tracks.length;
  let itotal = tracks.length;
  let imediaMetadata = [];

  for (const track of tracks) {
    let authorId =
      libraryItem.media.metadata &&
      libraryItem.media.metadata.authors &&
      libraryItem.media.metadata.authors[0]
        ? libraryItem.media.metadata.authors[0].id
        : null;
    let authorName = authorId
      ? libraryItem.media.metadata.authors[0].name
      : null;
    let narratorId =
      libraryItem.media.metadata &&
      libraryItem.media.metadata.narrators &&
      libraryItem.media.metadata.narrators[0]
        ? libraryItem.media.metadata.narrators[0].id
        : null;
    let narratorName = narratorId
      ? libraryItem.media.metadata.narrators[0].name
      : null;

    var mediaMetadataEntry = {
      id: `${libraryItem.id}/${track.metadata.filename}`,
      itemType: "track",
      title: track.metadata.filename,
      mimeType: track.mimeType,
      trackMetadata: {
        authorId: authorId,
        author: authorName,
        narratorId: narratorId,
        narrator: narratorName,
        duration: track.duration,
        book: libraryItem.media.metadata
          ? libraryItem.media.metadata.title
          : null,
        albumArtURI: `${ABS_URI}${libraryItem.media.coverPath}?token=${ABS_TOKEN}`,
        canPlay: true,
        canAddToFavorites: false,
      },
    };

    imediaMetadata.push(mediaMetadataEntry);
  }

  let positionInformation = {};
  if (progressData) {
    positionInformation = {
      id: `${libraryItem.id}/${progressData.partName}`,
      index: 0,
      offsetMillis: Math.round(progressData.relativeTimeForPart * 1000),
    };
  }

  return {
    getMetadataResult: {
      count: icount,
      total: itotal,
      index: 0,
      positionInformation: positionInformation,
      mediaMetadata: imediaMetadata,
    },
  };
}

function partNameAndRelativeProgress(currentProgress, libraryItem) {
  console.log(
    "🚀 ~ file: utils.js:205 ~ partNameAndRelativeProgress ~ partNameAndRelativeProgress"
  );
  // create an array of each parts "running sum" (the current part + all previous parts durations)
  // find which part the currentProgress exists in, and return that part name and how far along it we are
  let audioFiles = libraryItem.media.audioFiles;
  let durations = audioFiles.map((x) => x.duration);
  let currentTime = currentProgress.currentTime;
  let newDurationSums = [];
  let running = 0;

  let res = {
    partName: "",
    relativeTimeForPart: 0,
  };

  for (const duration of durations) {
    running += duration;
    newDurationSums.push(running);
  }

  let inThisPart;
  for (const duration of newDurationSums) {
    if (duration > currentTime) {
      inThisPart = duration;
      break;
    }
  }

  let closestIndex = newDurationSums.indexOf(inThisPart);

  res.partName = audioFiles[closestIndex].metadata.filename;
  res.relativeTimeForPart =
    durations[closestIndex] == 0
      ? currentTime
      : Math.abs(currentTime - newDurationSums[closestIndex - 1]);

  return res;
}

async function buildProgress(libraryItem, updateObject) {
  console.log("🚀 ~ file: utils.js:244 ~ buildProgress ~ buildProgress");
  let partId = updateObject.libraryItemIdAndFileName.split("/")[1]; // li_{string}/Part##.mp3
  let audioFiles = libraryItem.media.audioFiles;
  let res = {
    progress: updateObject.positionMillis / 1000, // abs tracks progress in seconds
    bookDuration: audioFiles
      .map((audioFile) => audioFile.duration)
      .reduce((result, item) => result + item),
  };

  for (const audioFile of audioFiles) {
    let filename = audioFile.metadata.filename;

    if (filename == partId) {
      // only grab as much duration as up to the part we are currently at
      break;
    }

    res.progress += audioFile.duration;
  }

  return res;
}

// Methods to invoke
async function getMediaURI(id) {
  return await buildMediaURI(id);
}

async function getMetadataResult(libraryItemId) {
  console.log(
    "🚀 ~ file: utils.js:274 ~ getMetadataResult ~ getMetadataResult"
  );
  if (libraryItemId == "root") {
    let libraryItems = await getLibraryItems();
    return await buildLibraryMetadataResult(libraryItems);
  } else {
    let libraryItem = await getLibraryItem(libraryItemId);

    // if there is existing progress, figure it out here and send it along
    let absProgress = await getABSProgress(libraryItemId);
    let progressData;
    if (absProgress) {
      progressData = partNameAndRelativeProgress(absProgress, libraryItem);
    }

    return await buildAudiobookTrackList(libraryItem, progressData);
  }
}

async function updateAudioBookshelfProgress(updateObject) {
  console.log(
    "🚀 ~ file: utils.js:293 ~ updateAudioBookshelfProgress ~ updateAudioBookshelfProgress"
  );
  // 1. grab the library item
  // 2. sum up all parts prior to current from updateObject (grabing durations from step 1)
  // 3. add updateObject.positionMillis to sum from step 2

  let libraryItem = await getLibraryItem(updateObject.libraryItemId); // lets us get durations per part
  let progress = await buildProgress(libraryItem, updateObject);
  return await setProgress(updateObject, progress);
}

module.exports = {
  getMetadataResult,
  getMediaURI,
  updateAudioBookshelfProgress,
};
