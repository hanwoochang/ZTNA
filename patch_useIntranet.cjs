const fs = require('fs');

let content = fs.readFileSync('ztna-client/hooks/useIntranet.ts', 'utf8');

// Replace notices fetch
content = content.replace(
    /const \[notices, setNotices\] = useState<any\[\]>\(\[\]\);([\s\S]*?)handleApiError\(error, '\[게시글 목록 조회 실패\]', true\);\n        }\n    };/m,
    `const [notices, setNotices] = useState<any[]>([]);
    const [noticePage, setNoticePage] = useState(1);
    const [noticeTotalPages, setNoticeTotalPages] = useState(1);

    const fetchNotices = async (page = 1) => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(\`\${GATEWAY_URL}/private/api/notices?page=\${page}&limit=10\`, { headers });
            handleSyncHeader(response);
            setNotices(response.data.notices);
            setNoticePage(response.data.page);
            setNoticeTotalPages(response.data.totalPages);
        } catch (error: any) {
            handleApiError(error, '[게시글 목록 조회 실패]', true);
        }
    };`
);

// Add documents functions above notices
content = content.replace(
    /const \[notices, setNotices\] = useState/m,
    `const [documents, setDocuments] = useState<any[]>([]);

    const fetchDocuments = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await axios.get(\`\${GATEWAY_URL}/private/api/documents\`, { headers });
            setDocuments(response.data);
        } catch (error: any) {
            handleApiError(error, '[기밀문서 목록 조회 실패]', true);
        }
    };

    const uploadDocument = async (title: string, description: string, file: any) => {
        setIsLoading(true);
        try {
            const token = await Storage.getItemAsync('jwt_token');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream'
            } as any);

            await axios.post(\`\${GATEWAY_URL}/private/api/documents\`, formData, {
                headers: { 
                    Authorization: \`Bearer \${token}\`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            Alert.alert('업로드 완료', '문서가 성공적으로 추가되었습니다.');
            await fetchDocuments();
            return true;
        } catch (error: any) {
            handleApiError(error, '문서 업로드 권한이 없습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const [notices, setNotices] = useState`
);

// Replace downloadSecretPdf with downloadDocument
content = content.replace(
    /const downloadSecretPdf = async \(\) => {([\s\S]*?)finally {\n            setIsLoading\(false\);\n        }\n    };/m,
    `const downloadDocument = async (id: number, filename: string) => {
        setIsLoading(true);
        try {
            const token = await Storage.getItemAsync('jwt_token');
            if (!token) throw new Error('인증 토큰이 없습니다.');

            if (Platform.OS === 'web') {
                const response = await fetch(\`\${GATEWAY_URL}/private/api/documents/\${id}/download\`, {
                    headers: { Authorization: \`Bearer \${token}\` }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '문서 다운로드 권한이 없습니다.');
                }
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            } else {
                const fileUri = \`\${(FileSystem as any).documentDirectory}\${filename}\`;
                const downloadRes = await FileSystem.downloadAsync(
                    \`\${GATEWAY_URL}/private/api/documents/\${id}/download\`,
                    fileUri,
                    { headers: { Authorization: \`Bearer \${token}\` } }
                );

                if (downloadRes.status !== 200) {
                    throw new Error('문서 다운로드 권한이 없습니다.');
                }

                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(downloadRes.uri);
                } else {
                    Alert.alert('완료', '문서가 기기에 저장되었습니다.');
                }
            }
        } catch (error: any) {
            handleApiError(error, error.message);
        } finally {
            setIsLoading(false);
        }
    };`
);

// Replace return statement
content = content.replace(
    /return \{([\s\S]*?)\};/m,
    `return { 
        isLoading, 
        attendanceData, handleAttendance, fetchTodayAttendance,
        documents, fetchDocuments, uploadDocument, downloadDocument,
        notices, noticePage, noticeTotalPages, fetchNotices, createNotice, deleteNotice, updateNotice,
        events, fetchEvents, createEvent, deleteEvent,
        employees, fetchEmployees
    };`
);

fs.writeFileSync('ztna-client/hooks/useIntranet.ts', content);
console.log('useIntranet patched successfully.');
