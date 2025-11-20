/**
 * Service classes for KB Kinderboeken Plugin
 * Centralized business logic to avoid code duplication
 */

export { CoverDownloadService } from "./CoverDownloadService";
export { BookNoteCreatorService, type BookNoteCreationOptions, type BookNoteCreationResult } from "./BookNoteCreatorService";
export { WikidataApiClient, type WikidataAuthorInfo, type WikidataCharacterInfo, type WikidataBookInfo } from "./WikidataApiClient";
